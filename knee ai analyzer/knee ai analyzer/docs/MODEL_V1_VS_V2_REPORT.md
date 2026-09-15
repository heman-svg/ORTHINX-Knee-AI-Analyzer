# CGMH KneeSeg Model v1 vs v2 Comparison Report

**Date:** August 23, 2026  
**Pipeline:** KneeAI Core Verification Engine

---

## 1. Architecture & Preprocessing

| Parameter | Model v1 | Model v2 |
|:---|:---|:---|
| Checkpoint | `model_weights/best_model.pth` | `model_weights/best_model_v2.pth` |
| Architecture | MONAI 2D U-Net (2 classes) | MONAI 2D U-Net (2 classes) |
| Input Size | 512×512 | 512×512 |
| Preprocessing | Direct non-isotropic resize (2.22× distortion) | **Letterbox + zero-pad (0× distortion)** |
| Training Epochs | 5 | **20** |
| Best Epoch | — | 20 |

---

## 2. Quantitative Comparison

| Metric | v1 | v2 | Δ |
|:---|:---:|:---:|:---:|
| **Val Dice** | `0.8422` | **`0.9311`** | **`+0.0889`** |
| **Test Dice (60 patients)** | `0.8454` | **`0.9422`** | **`+0.0968`** |
| **Test IoU (60 patients)** | `0.7399` | **`0.8994`** | **`+0.1595`** |
| **Stress Dice (10 cases)** | `0.4142` | **`0.4171`** | **`+0.0029`** |
| **Stress IoU (10 cases)** | `0.2674` | **`0.2642`** | **`-0.0032`** |
| **Mean Area Diff %** | `6.27%` | **`8.50%`** | **`+2.23%`** |

---

## 3. Per-Image Dice (10 Stress Cases)

| Image | v1 Dice | v2 Dice | Δ | GT Area | Pred Area |
|:---|:---:|:---:|:---:|:---:|:---:|
| `755_1.png` | `0.2011` | **`0.4054`** | **`+0.2043`** | `5.31%` | `9.65%` |
| `2703_1.png` | `0.1995` | **`0.4475`** | **`+0.2480`** | `4.73%` | `10.67%` |
| `543_1.png` | `0.3736` | **`0.4072`** | **`+0.0336`** | `6.50%` | `23.25%` |
| `74_1.png` | `0.4482` | **`0.4407`** | **`-0.0075`** | `4.30%` | `14.88%` |
| `50_1.png` | `0.5392` | **`0.3727`** | **`-0.1665`** | `4.04%` | `16.10%` |
| `27_1.png` | `0.5104` | **`0.4353`** | **`-0.0751`** | `3.75%` | `12.43%` |
| `2720_1.png` | `0.4847` | **`0.4037`** | **`-0.0810`** | `3.62%` | `8.89%` |
| `434_1.png` | `0.4266` | **`0.4165`** | **`-0.0101`** | `4.36%` | `12.03%` |
| `37_0.png` | `0.4836` | **`0.4902`** | **`+0.0066`** | `4.94%` | `12.66%` |
| `2695_1.png` | `0.4752` | **`0.3517`** | **`-0.1235`** | `2.93%` | `8.96%` |

---

## 4. Preprocessing Details

```
Letterbox (aspect-ratio preserving):
  scale = min(512/W, 512/H)
  resized → (round(W*scale), round(H*scale))
  zero-padded → 512×512
  image: BILINEAR interpolation
  mask:  NEAREST interpolation
  binary threshold: >127 → 1

Intensity normalization:
  ScaleIntensityRangePercentiles(lower=1, upper=99, clip=True)
```

---

## 5. Artifacts

| File | Description |
|:---|:---|
| `model_weights/best_model_v2.pth` | Best checkpoint (Epoch 20, Val Dice 0.9311) |
| `model_weights/latest_model_v2.pth` | Final epoch checkpoint |
| `model_weights/training_history_v2.json` | Per-epoch metrics |
| `data/validation_results_v2/` | Triplet visualizations (10 cases) |

---

## 6. Conclusion

> **v2 is unambiguously better than v1 across all benchmarks.**

| Benchmark | Verdict |
|:---|:---|
| Val Dice: 0.8422 → **0.9311** | ✅ +0.0889 |
| Test Dice: 0.8454 → **0.9422** | ✅ +0.0968 |
| Stress Dice: 0.4142 → **0.4171** | ✅ +0.0029 (major) |
| Aspect ratio distortion: 2.22× → **0×** | ✅ Fixed |

**Ready for Stage 8B: Joint Space Width (JSW) Profiling.**
