import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useTheme } from "../../store/themeStore";

interface ThreeKneeVisualizerProps {
  activeTab: "anatomy" | "segmentation";
  viewAngle: "front" | "side" | "top" | "45";
  showLabels: boolean;
  activeTool: "rotate" | "zoom" | "pan" | "measure" | "labels" | "reset";
  onToolChange: (tool: any) => void;
  selectedAnatomy: "femur" | "patella" | "lateral" | "medial" | "tibia" | null;
  onSelectAnatomy: (part: any) => void;
}

export const ThreeKneeVisualizer: React.FC<ThreeKneeVisualizerProps> = ({
  activeTab,
  viewAngle,
  showLabels,
  activeTool,
  onToolChange,
  selectedAnatomy,
  onSelectAnatomy,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for Three.js objects to update materials dynamically
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const femurRef = useRef<THREE.Group | null>(null);
  const tibiaRef = useRef<THREE.Group | null>(null);
  const patellaRef = useRef<THREE.Mesh | null>(null);
  const medialMeniscusRef = useRef<THREE.Mesh | null>(null);
  const lateralMeniscusRef = useRef<THREE.Mesh | null>(null);

  // Label coordinates in 2D projected space
  const [labelPositions, setLabelPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({
    femur: { x: 0, y: 0, visible: false },
    patella: { x: 0, y: 0, visible: false },
    lateral: { x: 0, y: 0, visible: false },
    medial: { x: 0, y: 0, visible: false },
    tibia: { x: 0, y: 0, visible: false },
  });

  // Track standard colors
  const boneColor = 0xfcfaf2; // Warm ivory bone
  const lateralColor = 0x06b6d4; // Cyan lateral meniscus
  const medialColor = 0xa855f7; // Purple medial meniscus

  // Highlight colors in AI Segmentation mode
  const segmentationFemurColor = 0xd8b4fe; // Light purple
  const segmentationTibiaColor = 0x93c5fd; // Light blue
  const segmentationMedialColor = 0xfde047; // Yellow target

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create scene with true black (#050505) in dark mode, clean white in light mode
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "dark" ? 0x050505 : 0xffffff);
    sceneRef.current = scene;

    // Create camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 380;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2, 18);
    cameraRef.current = camera;

    // Create WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Orbit Controls
    const controls = new OrbitControls(camera, canvasRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 1.1; // prevent turning completely upside down
    controls.minDistance = 6;
    controls.maxDistance = 35;
    controlsRef.current = controls;

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, 12, 8);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dirLight2.position.set(-8, -2, -5);
    scene.add(dirLight2);

    // ==========================================
    // 3D KNEE MODEL GEOMETRY GENERATION
    // ==========================================

    // 1. FEMUR (Upper bone group)
    const femurGroup = new THREE.Group();

    // Shaft
    const femurShaftGeo = new THREE.CylinderGeometry(1.2, 1.4, 6, 32);
    const femurMaterial = new THREE.MeshStandardMaterial({
      color: boneColor,
      roughness: 0.3,
      metalness: 0.1,
    });
    const femurShaft = new THREE.Mesh(femurShaftGeo, femurMaterial);
    femurShaft.position.y = 3;
    femurShaft.castShadow = true;
    femurShaft.receiveShadow = true;
    femurGroup.add(femurShaft);

    // Condyle lateral
    const latCondyleGeo = new THREE.SphereGeometry(1.4, 32, 32);
    latCondyleGeo.scale(1, 1, 1.25);
    const latCondyle = new THREE.Mesh(latCondyleGeo, femurMaterial);
    latCondyle.position.set(-1.0, 0, 0);
    latCondyle.castShadow = true;
    latCondyle.receiveShadow = true;
    femurGroup.add(latCondyle);

    // Condyle medial
    const medCondyleGeo = new THREE.SphereGeometry(1.4, 32, 32);
    medCondyleGeo.scale(1, 1, 1.25);
    const medCondyle = new THREE.Mesh(medCondyleGeo, femurMaterial);
    medCondyle.position.set(1.0, 0, 0);
    medCondyle.castShadow = true;
    medCondyle.receiveShadow = true;
    femurGroup.add(medCondyle);

    scene.add(femurGroup);
    femurRef.current = femurGroup;

    // 2. TIBIA (Lower bone group)
    const tibiaGroup = new THREE.Group();

    // Shaft
    const tibiaShaftGeo = new THREE.CylinderGeometry(1.3, 1.0, 6, 32);
    const tibiaMaterial = new THREE.MeshStandardMaterial({
      color: boneColor,
      roughness: 0.35,
      metalness: 0.1,
    });
    const tibiaShaft = new THREE.Mesh(tibiaShaftGeo, tibiaMaterial);
    tibiaShaft.position.y = -4.2;
    tibiaShaft.castShadow = true;
    tibiaShaft.receiveShadow = true;
    tibiaGroup.add(tibiaShaft);

    // Plateau head
    const tibiaPlateauGeo = new THREE.CylinderGeometry(2.3, 1.6, 1.4, 32);
    const tibiaPlateau = new THREE.Mesh(tibiaPlateauGeo, tibiaMaterial);
    tibiaPlateau.position.y = -1.5;
    tibiaPlateau.castShadow = true;
    tibiaPlateau.receiveShadow = true;
    tibiaGroup.add(tibiaPlateau);

    scene.add(tibiaGroup);
    tibiaRef.current = tibiaGroup;

    // 3. PATELLA (Kneecap)
    const patellaGeo = new THREE.SphereGeometry(0.85, 32, 32);
    patellaGeo.scale(1.2, 1.4, 0.7);
    const patellaMaterial = new THREE.MeshStandardMaterial({
      color: boneColor,
      roughness: 0.4,
      metalness: 0.05,
    });
    const patella = new THREE.Mesh(patellaGeo, patellaMaterial);
    patella.position.set(0, 0.4, 2.0); // positioned anteriorly in joint gap
    patella.castShadow = true;
    scene.add(patella);
    patellaRef.current = patella;

    // 4. LATERAL MENISCUS (Cartilage - Cyan)
    // Modeled using a partial Torus geometry for circular shape
    const latMeniscusGeo = new THREE.TorusGeometry(1.5, 0.28, 16, 64, Math.PI * 1.1);
    const latMeniscusMaterial = new THREE.MeshStandardMaterial({
      color: lateralColor,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });
    const lateralMeniscus = new THREE.Mesh(latMeniscusGeo, latMeniscusMaterial);
    lateralMeniscus.rotation.x = Math.PI / 2; // Lie flat in joint gap
    lateralMeniscus.rotation.z = Math.PI * 0.95; // Position on lateral side
    lateralMeniscus.position.set(-0.25, -0.7, 0.1);
    scene.add(lateralMeniscus);
    lateralMeniscusRef.current = lateralMeniscus;

    // 5. MEDIAL MENISCUS (Cartilage - Purple)
    const medMeniscusGeo = new THREE.TorusGeometry(1.55, 0.28, 16, 64, Math.PI * 1.25);
    const medMeniscusMaterial = new THREE.MeshStandardMaterial({
      color: medialColor,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });
    const medialMeniscus = new THREE.Mesh(medMeniscusGeo, medMeniscusMaterial);
    medialMeniscus.rotation.x = Math.PI / 2;
    medialMeniscus.rotation.z = Math.PI * 1.85; // Position on medial side
    medialMeniscus.position.set(0.25, -0.7, 0.1);
    scene.add(medialMeniscus);
    medialMeniscusRef.current = medialMeniscus;

    // Raycasting for clicking/selecting bone objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check intersections
      // Assemble flat list of meshes to hit
      const meshesToTest = [
        ...femurGroup.children,
        ...tibiaGroup.children,
        patella,
        lateralMeniscus,
        medialMeniscus,
      ];

      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hitObject = intersects[0].object;

        // Trace back which bone group was hit
        if (femurGroup.children.includes(hitObject)) {
          onSelectAnatomy("femur");
        } else if (tibiaGroup.children.includes(hitObject)) {
          onSelectAnatomy("tibia");
        } else if (hitObject === patella) {
          onSelectAnatomy("patella");
        } else if (hitObject === lateralMeniscus) {
          onSelectAnatomy("lateral");
        } else if (hitObject === medialMeniscus) {
          onSelectAnatomy("medial");
        }
      }
    };

    renderer.domElement.addEventListener("click", handleCanvasClick);

    // ==========================================
    // ANIMATION LOOP & PROJECTION OF LABELS
    // ==========================================
    let animationFrameId: number;

    const project3DTo2D = () => {
      if (!cameraRef.current || !containerRef.current) return;

      const cam = cameraRef.current;
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight || 380;

      const positions: Record<string, THREE.Vector3> = {
        femur: new THREE.Vector3(0, 3, 0),
        patella: new THREE.Vector3(0.5, 0.4, 2.0),
        lateral: new THREE.Vector3(-1.6, -0.7, 0.2),
        medial: new THREE.Vector3(1.6, -0.7, 0.2),
        tibia: new THREE.Vector3(0, -3.2, 0),
      };

      const newPositions: Record<string, { x: number; y: number; visible: boolean }> = {};

      for (const [key, vec] of Object.entries(positions)) {
        const localVec = vec.clone();
        
        // If it's part of a group, fetch the group world coordinate
        if (key === "femur" && femurRef.current) {
          femurRef.current.localToWorld(localVec);
        } else if (key === "tibia" && tibiaRef.current) {
          tibiaRef.current.localToWorld(localVec);
        }

        localVec.project(cam);

        // Project coordinate to 2D screen space
        const x = (localVec.x * 0.5 + 0.5) * containerW;
        const y = (-(localVec.y) * 0.5 + 0.5) * containerH;

        // Check if the node is behind the camera
        const visible = localVec.z < 1;

        newPositions[key] = { x, y, visible };
      }

      setLabelPositions(newPositions);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Auto rotation if tool is set to Rotate and user is not interacting
      if (activeTool === "rotate" && (controls as any).state === -1) {
        scene.rotation.y += 0.005;
      } else {
        scene.rotation.y = 0; // lock scene rotation, let controls handle it
      }

      controls.update();
      renderer.render(scene, camera);
      project3DTo2D();
    };

    animate();

    // ==========================================
    // RESIZE LISTENER
    // ==========================================
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 380;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener("click", handleCanvasClick);
      }
      renderer.dispose();
    };
  }, [activeTool]);

  // ==========================================
  // EFFECT FOR CAMERA ANGLE TRANSITIONS
  // ==========================================
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Reset controls targets
    controls.target.set(0, -1, 0);

    // Smooth transition coords
    if (viewAngle === "front") {
      camera.position.set(0, 1.2, 16);
    } else if (viewAngle === "side") {
      camera.position.set(16, 0.8, 0);
    } else if (viewAngle === "top") {
      camera.position.set(0, 18, 0.1);
    } else if (viewAngle === "45") {
      camera.position.set(11, 8, 11);
    }
    controls.update();
  }, [viewAngle]);

  // ==========================================
  // EFFECT FOR TOOL ACTION SELECTIONS
  // ==========================================
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (activeTool === "zoom") {
      controls.enableZoom = true;
      controls.enableRotate = false;
      controls.enablePan = false;
    } else if (activeTool === "pan") {
      controls.enableZoom = true;
      controls.enableRotate = false;
      controls.enablePan = true;
    } else {
      // rotate default mode
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = false;
    }
  }, [activeTool]);

  // ==========================================
  // EFFECT FOR TAB TOGGLES (ANATOMY vs SEGMENTATION Highlights)
  // ==========================================
  useEffect(() => {
    if (!femurRef.current || !tibiaRef.current || !medialMeniscusRef.current || !lateralMeniscusRef.current || !patellaRef.current) return;

    const femurMat = (femurRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const tibiaMat = (tibiaRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const patellaMat = patellaRef.current.material as THREE.MeshStandardMaterial;
    const latMat = lateralMeniscusRef.current.material as THREE.MeshStandardMaterial;
    const medMat = medialMeniscusRef.current.material as THREE.MeshStandardMaterial;

    if (activeTab === "segmentation") {
      // Highlight the targeted segmentation classes
      femurMat.color.setHex(segmentationFemurColor);
      tibiaMat.color.setHex(segmentationTibiaColor);
      medMat.color.setHex(segmentationMedialColor);
      latMat.color.setHex(lateralColor); // regular lateral
      patellaMat.color.setHex(boneColor); // dim bone

      // Apply light emissive glow
      femurMat.emissive.setHex(0x3b0764);
      femurMat.emissiveIntensity = 0.25;
      tibiaMat.emissive.setHex(0x1e3a8a);
      tibiaMat.emissiveIntensity = 0.25;
      medMat.emissive.setHex(0x713f12);
      medMat.emissiveIntensity = 0.35;
    } else {
      // Anatomy Mode: Standard ivory bone textures
      femurMat.color.setHex(boneColor);
      tibiaMat.color.setHex(boneColor);
      patellaMat.color.setHex(boneColor);
      latMat.color.setHex(lateralColor);
      medMat.color.setHex(medialColor);

      // Disable emissive glows
      femurMat.emissive.setHex(0x000000);
      tibiaMat.emissive.setHex(0x000000);
      medMat.emissive.setHex(0x000000);
    }
  }, [activeTab]);

  // ==========================================
  // EFFECT FOR ACTIVE BONE SELECTION SHADOW/GLOW
  // ==========================================
  useEffect(() => {
    if (!femurRef.current || !tibiaRef.current || !medialMeniscusRef.current || !lateralMeniscusRef.current || !patellaRef.current) return;

    const femurMat = (femurRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const tibiaMat = (tibiaRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const patellaMat = patellaRef.current.material as THREE.MeshStandardMaterial;
    const latMat = lateralMeniscusRef.current.material as THREE.MeshStandardMaterial;
    const medMat = medialMeniscusRef.current.material as THREE.MeshStandardMaterial;

    // Reset roughness/emissive values
    femurMat.roughness = 0.3;
    tibiaMat.roughness = 0.35;
    patellaMat.roughness = 0.4;
    latMat.roughness = 0.2;
    medMat.roughness = 0.2;

    if (selectedAnatomy === "femur") {
      femurMat.roughness = 0.05;
      femurMat.emissive.setHex(0x4338ca);
      femurMat.emissiveIntensity = activeTab === "segmentation" ? 0.4 : 0.25;
    } else if (selectedAnatomy === "tibia") {
      tibiaMat.roughness = 0.05;
      tibiaMat.emissive.setHex(0x4338ca);
      tibiaMat.emissiveIntensity = activeTab === "segmentation" ? 0.4 : 0.25;
    } else if (selectedAnatomy === "patella") {
      patellaMat.roughness = 0.05;
      patellaMat.emissive.setHex(0x4338ca);
      patellaMat.emissiveIntensity = 0.3;
    } else if (selectedAnatomy === "lateral") {
      latMat.roughness = 0.01;
      latMat.emissive.setHex(0x0e7490);
      latMat.emissiveIntensity = 0.35;
    } else if (selectedAnatomy === "medial") {
      medMat.roughness = 0.01;
      medMat.emissive.setHex(0x6d28d9);
      medMat.emissiveIntensity = 0.4;
    }
  }, [selectedAnatomy, activeTab]);

  // Dynamic background update when theme toggles
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(theme === "dark" ? 0x050505 : 0xffffff);
    }
  }, [theme]);

  const labelConfig: Record<
    string,
    { label: string; offsetLeft: string; color: string; val?: string; isMeasurement: boolean }
  > = {
    femur: { label: "Femur", offsetLeft: "52px", color: "var(--primary)", val: "52.6 mm", isMeasurement: activeTool === "measure" },
    patella: { label: "Patella", offsetLeft: "56px", color: "var(--text-main)", isMeasurement: false },
    lateral: { label: "Lateral Meniscus", offsetLeft: "42px", color: "#10b981", val: "3.1 mm", isMeasurement: true },
    medial: { label: "Medial Meniscus", offsetLeft: "46px", color: "#7c3aed", val: "3.4 mm", isMeasurement: true },
    tibia: { label: "Tibia", offsetLeft: "84px", color: "var(--primary)", val: "41.2 mm", isMeasurement: activeTool === "measure" },
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        flex: 1,
        borderRadius: "12px",
        border: "1px solid var(--border)",
        overflow: "hidden",
        background: theme === "dark" ? "#050505" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "380px",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          outline: "none",
        }}
      />

      {/* Render callout labels dynamically based on 3D coordinates */}
      {showLabels &&
        Object.entries(labelPositions).map(([key, pos]) => {
          if (!pos.visible) return null;
          const isSelected = selectedAnatomy === key;
          const config = labelConfig[key];

          return (
            <div
              key={key}
              style={{
                position: "absolute",
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 12,
              }}
            >
              <div style={{ position: "relative" }}>
                {/* Pin Circle Dot */}
                <button
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: "2.5px solid #fff",
                    background: isSelected ? "var(--primary)" : "#64748b",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    pointerEvents: "auto",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectAnatomy(key as any)}
                >
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                </button>

                {/* Connector line overlay extending to the right */}
                <div
                  style={{
                    position: "absolute",
                    top: "7px",
                    left: "14px",
                    width: key === "tibia" ? "64px" : "32px",
                    height: "1px",
                    background: "#94a3b8",
                  }}
                />

                {/* Label text */}
                <div
                  onClick={() => onSelectAnatomy(key as any)}
                  style={{
                    position: "absolute",
                    top: key === "medial" || key === "lateral" ? "-12px" : "-3px",
                    left: config.offsetLeft,
                    cursor: "pointer",
                    pointerEvents: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: isSelected ? "var(--primary)" : "#334155",
                      whiteSpace: "nowrap",
                      textShadow: "0px 0px 4px rgba(255,255,255,0.8)",
                    }}
                  >
                    {config.label}
                  </span>
                  {config.val && config.isMeasurement && (
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 800,
                        color: config.color,
                        marginTop: "1px",
                        whiteSpace: "nowrap",
                        textShadow: "0px 0px 4px rgba(255,255,255,0.8)",
                      }}
                    >
                      {config.val}
                    </span>
                  )}
                </div>

                {/* Pulsing Touch Feedback */}
                {isSelected && <div className="pulse-ripple" />}
              </div>
            </div>
          );
        })}
    </div>
  );
};
