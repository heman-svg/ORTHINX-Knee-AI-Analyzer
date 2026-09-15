"""
Script to create a safe synthetic/mock knee radiograph fixture for backend smoke testing.
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

def create_mock_knee_radiograph():
    out_dir = Path("data/validation_results/v2/mock_demo")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Non-square tall dimensions typical of knee radiographs (1088 x 2680)
    w, h = 1088, 2680
    
    # 1. Base dark background with soft gradient
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    base_bg = 15.0 + 10.0 * np.sin(np.pi * x_coords / w) + 15.0 * (1.0 - y_coords / h)
    
    # 2. Soft tissue envelope (oval cylinder)
    center_x = w / 2.0
    tissue_mask = np.exp(-((x_coords - center_x) / (w * 0.42))**4)
    tissue_intensity = 35.0 * tissue_mask
    
    img_arr = base_bg + tissue_intensity
    
    # 3. Distal Femur (Superior bone)
    # Condyles extending from top down to knee joint level around y = 1250
    femur_center_y = 600
    femur_shaft = (np.abs(x_coords - center_x) < (w * 0.22)) & (y_coords < 1100)
    
    # Medial and lateral condyles
    medial_condyle = (((x_coords - (center_x - 160))**2 / (150**2)) + ((y_coords - 1180)**2 / (180**2))) <= 1.0
    lateral_condyle = (((x_coords - (center_x + 160))**2 / (145**2)) + ((y_coords - 1180)**2 / (175**2))) <= 1.0
    intercondylar_notch = (((x_coords - center_x)**2 / (60**2)) + ((y_coords - 1120)**2 / (100**2))) <= 1.0
    
    femur_bone = (femur_shaft | medial_condyle | lateral_condyle) & ~intercondylar_notch & (y_coords <= 1260)
    
    # 4. Proximal Tibia & Fibula (Inferior bone)
    # Tibial plateau around y = 1380 to bottom
    tibia_plateau_medial = (((x_coords - (center_x - 150))**2 / (160**2)) + ((y_coords - 1460)**2 / (120**2))) <= 1.0
    tibia_plateau_lateral = (((x_coords - (center_x + 150))**2 / (150**2)) + ((y_coords - 1460)**2 / (115**2))) <= 1.0
    tibia_spines = (((x_coords - center_x)**2 / (40**2)) + ((y_coords - 1340)**2 / (60**2))) <= 1.0
    tibia_shaft = (np.abs(x_coords - (center_x - 20)) < (w * 0.20)) & (y_coords >= 1420)
    
    # Fibula on lateral side
    fibula_head = (((x_coords - (center_x + 340))**2 / (55**2)) + ((y_coords - 1520)**2 / (75**2))) <= 1.0
    fibula_shaft = (np.abs(x_coords - (center_x + 340)) < (35)) & (y_coords >= 1520)
    
    tibia_bone = (tibia_plateau_medial | tibia_plateau_lateral | tibia_spines | tibia_shaft) & (y_coords >= 1320)
    fibula_bone = (fibula_head | fibula_shaft) & (y_coords >= 1470)
    
    # Add bone cortical and trabecular density
    img_arr[femur_bone] += 120.0
    img_arr[tibia_bone] += 115.0
    img_arr[fibula_bone] += 95.0
    
    # Add cortical edge highlights
    cortical_boost = 35.0 * np.exp(-((x_coords - (center_x - 210))**2) / 200.0) + 35.0 * np.exp(-((x_coords - (center_x + 210))**2) / 200.0)
    img_arr[femur_bone | tibia_bone] += cortical_boost[femur_bone | tibia_bone]
    
    # 5. Joint space clearance (between y=1260 and y=1340) with subchondral plate darkening
    joint_space_zone = (y_coords > 1250) & (y_coords < 1340) & (np.abs(x_coords - center_x) < (w * 0.35))
    img_arr[joint_space_zone] = np.clip(img_arr[joint_space_zone] * 0.55 + 25.0, 0, 255)
    
    # 6. Realistic anatomical smoothing and noise
    np.random.seed(42)
    gaussian_noise = np.random.normal(0, 4.5, (h, w))
    img_arr += gaussian_noise
    
    # Clip to valid 8-bit unsigned integer range [0, 255]
    u8_img = np.clip(img_arr, 0, 255).astype(np.uint8)
    
    pil_img = Image.fromarray(u8_img)
    # Mild smooth filter
    pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=1.2))
    
    mock_img_path = out_dir / "mock_knee_xray.png"
    pil_img.save(mock_img_path)
    print(f"[+] Successfully generated mock knee radiograph: {mock_img_path} ({w}x{h})")
    
    readme_path = out_dir / "README.md"
    readme_content = """# Synthetic Mock Knee Radiograph Demonstration Fixture

**File:** `mock_knee_xray.png`  
**Dimensions:** 1088 × 2680 px  
**Format:** Grayscale PNG  
**Purpose:** Software Demonstration Fixture  

---

> [!IMPORTANT]
> **SYNTHETIC SOFTWARE TEST FIXTURE ONLY:**
> This is a synthetic software-test image created only for backend pipeline demonstration. It is not a real medical image and must not be used for clinical interpretation.
"""
    readme_path.write_text(readme_content, encoding="utf-8")
    print(f"[+] Created mock demo documentation: {readme_path}")

if __name__ == "__main__":
    create_mock_knee_radiograph()
