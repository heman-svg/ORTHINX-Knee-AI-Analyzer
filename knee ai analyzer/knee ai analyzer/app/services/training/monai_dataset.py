from typing import List, Dict, Tuple, Optional, Any, Sequence
import numpy as np
import torch
from monai.data import Dataset, DataLoader
from monai.transforms import (
    Compose,
    LoadImaged,
    EnsureChannelFirstd,
    Orientationd,
    Spacingd,
    NormalizeIntensityd,
    ScaleIntensityRangePercentilesd,
    Resized,
    RandCropByPosNegLabeld,
    RandAffined,
    RandGaussianNoised,
    EnsureTyped,
    Lambdad,
    MapTransform,
)
from PIL import Image

from app.services.training.config import TrainingConfig


def convert_mask_binary(x):
    """
    Non-destructively convert mask pixel values from [0, 255] to discrete class indices [0, 1].
    Leaves original files on disk untouched.
    """
    if torch.is_tensor(x):
        return (x > 127).to(torch.int64)
    return (x > 127).astype(np.int64)


def convert_image_to_single_channel(x):
    """
    Ensure 2D radiograph image tensor is single-channel grayscale (1, H, W).
    """
    if x.shape[0] > 1:
        return x[0:1, ...]
    return x



def letterbox_image_array(
    arr_2d: np.ndarray,
    spatial_size: Tuple[int, int] = (512, 512),
    is_mask: bool = False,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Standalone function to letterbox a 2D numpy array (H, W) preserving native aspect ratio,
    padding symmetrically with zeros to spatial_size.
    Returns:
        padded_array (H_target, W_target), metadata dict with scaling and padding parameters.
    """
    h, w = arr_2d.shape[:2]
    tw, th = spatial_size
    scale = min(tw / w, th / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    pad_x = (tw - nw) // 2
    pad_y = (th - nh) // 2

    meta = {
        "orig_h": h,
        "orig_w": w,
        "scale": scale,
        "nw": nw,
        "nh": nh,
        "pad_x": pad_x,
        "pad_y": pad_y,
        "spatial_size": spatial_size,
    }

    if is_mask:
        pil_im = Image.fromarray((arr_2d > 0).astype(np.uint8) * 255)
        pil_res = pil_im.resize((nw, nh), Image.Resampling.NEAREST)
        canvas = Image.new("L", (tw, th), 0)
        canvas.paste(pil_res, (pad_x, pad_y))
        padded = (np.array(canvas) > 127).astype(arr_2d.dtype)
    else:
        if arr_2d.dtype == np.uint8:
            pil_im = Image.fromarray(arr_2d)
        else:
            pil_im = Image.fromarray(np.clip(arr_2d, 0, 255).astype(np.uint8))
        pil_res = pil_im.resize((nw, nh), Image.Resampling.BILINEAR)
        canvas = Image.new("L", (tw, th), 0)
        canvas.paste(pil_res, (pad_x, pad_y))
        padded = np.array(canvas).astype(arr_2d.dtype)

    return padded, meta


def unletterbox_mask_array(
    padded_mask_2d: np.ndarray,
    meta: Dict[str, Any],
) -> np.ndarray:
    """
    Inverse transform: map a 512x512 letterbox predicted binary mask back to native image dimensions.
    """
    pad_x = meta["pad_x"]
    pad_y = meta["pad_y"]
    nw = meta["nw"]
    nh = meta["nh"]
    orig_w = meta["orig_w"]
    orig_h = meta["orig_h"]

    # Crop the active unpadded region
    cropped = padded_mask_2d[pad_y : pad_y + nh, pad_x : pad_x + nw]

    # Resize back to native dimensions with nearest-neighbor interpolation to preserve integer classes
    pil_crop = Image.fromarray((cropped > 0).astype(np.uint8) * 255)
    pil_orig = pil_crop.resize((orig_w, orig_h), Image.Resampling.NEAREST)
    return (np.array(pil_orig) > 127).astype(padded_mask_2d.dtype)


def unletterbox_coordinates(
    x_pad: float,
    y_pad: float,
    meta: Dict[str, Any],
) -> Tuple[float, float]:
    """
    Map coordinate point (x, y) from 512x512 letterbox canvas back to native original image coordinates.
    """
    x_cropped = x_pad - meta["pad_x"]
    y_cropped = y_pad - meta["pad_y"]
    x_orig = x_cropped / meta["scale"]
    y_orig = y_cropped / meta["scale"]
    x_orig_clamped = max(0.0, min(float(meta["orig_w"] - 1), x_orig))
    y_orig_clamped = max(0.0, min(float(meta["orig_h"] - 1), y_orig))
    return x_orig_clamped, y_orig_clamped


class LetterboxResizeAndPadd(MapTransform):
    """
    Resize 2D radiograph image and mask while strictly preserving native aspect ratio,
    then pad symmetrically to target_size (default: 512x512) with zeros.
    Image uses Bilinear interpolation; Mask uses Nearest-Neighbor interpolation.
    Records transformation metadata in data['letterbox_meta'].
    """

    def __init__(self, keys=("image", "mask"), spatial_size: Tuple[int, int] = (512, 512)):
        super().__init__(keys)
        self.spatial_size = spatial_size

    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        d = dict(data)
        tw, th = self.spatial_size

        if "image" not in d:
            return d

        img = d["image"]
        c, h, w = img.shape
        scale = min(tw / w, th / h)
        nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
        pad_x = (tw - nw) // 2
        pad_y = (th - nh) // 2

        d["letterbox_meta"] = {
            "orig_h": h,
            "orig_w": w,
            "scale": scale,
            "nw": nw,
            "nh": nh,
            "pad_x": pad_x,
            "pad_y": pad_y,
            "spatial_size": self.spatial_size,
        }

        for key in self.keys:
            if key not in d:
                continue
            item = d[key]
            is_mask = "mask" in key.lower() or "label" in key.lower()

            if torch.is_tensor(item):
                arr = item.cpu().numpy()
            else:
                arr = item

            ch = arr.shape[0]
            padded_arr = np.zeros((ch, th, tw), dtype=arr.dtype)

            for i in range(ch):
                sl = arr[i]
                if is_mask:
                    pil_im = Image.fromarray((sl > 0).astype(np.uint8) * 255)
                    pil_res = pil_im.resize((nw, nh), Image.Resampling.NEAREST)
                    canvas = Image.new("L", (tw, th), 0)
                    canvas.paste(pil_res, (pad_x, pad_y))
                    padded_arr[i] = (np.array(canvas) > 127).astype(arr.dtype)
                else:
                    if arr.dtype == np.uint8:
                        pil_im = Image.fromarray(sl)
                    else:
                        pil_im = Image.fromarray(np.clip(sl, 0, 255).astype(np.uint8))
                    pil_res = pil_im.resize((nw, nh), Image.Resampling.BILINEAR)
                    canvas = Image.new("L", (tw, th), 0)
                    canvas.paste(pil_res, (pad_x, pad_y))
                    padded_arr[i] = np.array(canvas).astype(arr.dtype)

            if torch.is_tensor(item):
                d[key] = torch.from_numpy(padded_arr).to(item.device)
            else:
                d[key] = padded_arr

        return d


def get_2d_training_transforms(
    spatial_size: Tuple[int, int] = (512, 512),
    preserve_aspect_ratio: bool = True,
) -> Compose:
    """
    Construct MONAI data augmentation & preprocessing transform pipeline for 2D CGMH KneeSeg radiograph training.
    CRITICAL: Mask interpolation MUST strictly be 'nearest' to preserve discrete integer class labels.
    """
    resize_transform = (
        LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=spatial_size)
        if preserve_aspect_ratio
        else Resized(keys=["image", "mask"], spatial_size=spatial_size, mode=("bilinear", "nearest"))
    )

    return Compose([
        LoadImaged(keys=["image", "mask"]),
        EnsureChannelFirstd(keys=["image", "mask"]),
        Lambdad(keys=["image"], func=convert_image_to_single_channel),
        Lambdad(keys=["mask"], func=convert_mask_binary),
        resize_transform,
        ScaleIntensityRangePercentilesd(keys=["image"], lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True),
        RandAffined(
            keys=["image", "mask"],
            mode=("bilinear", "nearest"),
            prob=0.5,
            rotate_range=0.1,
            translate_range=(10, 10),
            scale_range=0.1,
            padding_mode="zeros",
        ),
        EnsureTyped(keys=["image", "mask"]),
    ])


def get_2d_validation_transforms(
    spatial_size: Tuple[int, int] = (512, 512),
    preserve_aspect_ratio: bool = True,
) -> Compose:
    """
    Construct deterministic validation/test preprocessing transform pipeline for 2D radiographs.
    """
    resize_transform = (
        LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=spatial_size)
        if preserve_aspect_ratio
        else Resized(keys=["image", "mask"], spatial_size=spatial_size, mode=("bilinear", "nearest"))
    )

    return Compose([
        LoadImaged(keys=["image", "mask"]),
        EnsureChannelFirstd(keys=["image", "mask"]),
        Lambdad(keys=["image"], func=convert_image_to_single_channel),
        Lambdad(keys=["mask"], func=convert_mask_binary),
        resize_transform,
        ScaleIntensityRangePercentilesd(keys=["image"], lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True),
        EnsureTyped(keys=["image", "mask"]),
    ])


def get_3d_training_transforms(patch_size: Tuple[int, int, int] = (96, 96, 32), num_samples: int = 4) -> Compose:
    """
    Volumetric 3D MRI training transform pipeline.
    """
    return Compose([
        LoadImaged(keys=["image", "mask"]),
        EnsureChannelFirstd(keys=["image", "mask"]),
        Orientationd(keys=["image", "mask"], axcodes="RAS"),
        Spacingd(keys=["image", "mask"], pixdim=(1.0, 1.0, 1.0), mode=("bilinear", "nearest")),
        NormalizeIntensityd(keys=["image"], nonzero=True, channel_wise=True),
        RandCropByPosNegLabeld(
            keys=["image", "mask"],
            label_key="mask",
            spatial_size=patch_size,
            pos=2,
            neg=1,
            num_samples=num_samples,
            image_key="image",
            image_threshold=0,
        ),
        RandAffined(
            keys=["image", "mask"],
            mode=("bilinear", "nearest"),
            prob=0.5,
            rotate_range=(0.1, 0.1, 0.1),
            translate_range=(5, 5, 5),
            scale_range=(0.1, 0.1, 0.1),
            padding_mode="zeros",
        ),
        RandGaussianNoised(keys=["image"], prob=0.3, mean=0.0, std=0.1),
        EnsureTyped(keys=["image", "mask"]),
    ])


def get_3d_validation_transforms() -> Compose:
    """
    Volumetric 3D MRI validation transform pipeline.
    """
    return Compose([
        LoadImaged(keys=["image", "mask"]),
        EnsureChannelFirstd(keys=["image", "mask"]),
        Orientationd(keys=["image", "mask"], axcodes="RAS"),
        Spacingd(keys=["image", "mask"], pixdim=(1.0, 1.0, 1.0), mode=("bilinear", "nearest")),
        NormalizeIntensityd(keys=["image"], nonzero=True, channel_wise=True),
        EnsureTyped(keys=["image", "mask"]),
    ])


def create_monai_dataloaders(
    train_files: List[Dict[str, str]],
    val_files: List[Dict[str, str]],
    test_files: Optional[List[Dict[str, str]]] = None,
    config: Optional[TrainingConfig] = None,
) -> Tuple[DataLoader, DataLoader, Optional[DataLoader]]:
    """
    Build MONAI DataLoaders for Train, Validation, and Test sets.
    Automatically selects 2D or 3D transform pipelines based on config.spatial_dims.
    """
    cfg = config or TrainingConfig()

    if cfg.spatial_dims == 2:
        train_tf = get_2d_training_transforms(spatial_size=cfg.spatial_size_2d)
        val_tf = get_2d_validation_transforms(spatial_size=cfg.spatial_size_2d)
    else:
        train_tf = get_3d_training_transforms(patch_size=cfg.patch_size_3d, num_samples=cfg.num_samples_per_volume)
        val_tf = get_3d_validation_transforms()

    train_ds = Dataset(data=train_files, transform=train_tf)
    val_ds = Dataset(data=val_files, transform=val_tf)

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg.batch_size,
        shuffle=True,
        num_workers=cfg.num_workers,
        pin_memory=False,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=1,
        shuffle=False,
        num_workers=cfg.num_workers,
        pin_memory=False,
    )

    test_loader = None
    if test_files:
        test_ds = Dataset(data=test_files, transform=val_tf)
        test_loader = DataLoader(test_ds, batch_size=1, shuffle=False, num_workers=cfg.num_workers)

    return train_loader, val_loader, test_loader

# Aliases for generic transform access
get_training_transforms = get_2d_training_transforms
get_validation_transforms = get_2d_validation_transforms
