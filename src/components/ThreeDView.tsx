import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  FurnitureModule,
  Project,
  CountertopConfig,
  PlinthConfig,
  BacksplashConfig,
  OpeningType,
  HingeSide,
  InteractivePartState
} from '../types/furniture';
import { MODULE_TEMPLATES, ModuleTemplate, INITIAL_PROJECTS } from '../data/initialData';
import {
  getWoodTexture,
  getStoneTexture,
  getFloorTileTexture,
  getWallTexture,
  getContactShadowTexture
} from '../utils/materials3d';
import {
  Sun,
  Moon,
  DoorOpen,
  DoorClosed,
  RotateCw,
  Move,
  Trash2,
  Copy,
  Plus,
  Compass,
  Magnet,
  Check,
  Sparkles,
  Layers,
  ChevronDown,
  X,
  CornerDownRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Sliders,
  AlertTriangle,
  Settings,
  ChevronRight,
  Maximize2,
  Eye,
  Camera
} from 'lucide-react';

interface ThreeDViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onSwitchToConstructor: () => void;
}

interface PartRuntimeData {
  id: string;
  moduleId: string;
  name: string;
  type: 'door' | 'drawer' | 'shelf' | 'handle';
  openingType: OpeningType;
  hingeSide: HingeSide;
  maxAngle: number;
  maxSlide: number;
  isOpen: boolean;
  openProgress: number; // target (0 or 1)
  currentProgress: number; // animated (0.0 to 1.0)
  runnerType?: string;
  threeGroup: THREE.Group | null;
  meshObject: THREE.Mesh | null;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({
  project,
  onUpdateProject,
  onSwitchToConstructor
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [showHierarchyDrawer, setShowHierarchyDrawer] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<
    'НИЖНИЕ МОДУЛИ' | 'ВЕРХНИЕ МОДУЛИ' | 'ПЕНАЛЫ' | 'ТЕХНИКА'
  >('НИЖНИЕ МОДУЛИ');

  // Interactive 3D drag / edit mode
  const [interactionMode, setInteractionMode] = useState<'orbit' | 'move'>('orbit');
  const [snapFeedback, setSnapFeedback] = useState<string | null>(null);
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);

  // References for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modulesGroupRef = useRef<THREE.Group | null>(null);
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lightsRef = useRef<{
    dirLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    spotLight1: THREE.SpotLight;
    spotLight2: THREE.SpotLight;
    ledStripLight: THREE.PointLight;
  } | null>(null);

  // Runtime registry of interactive doors and drawers
  const partsRegistry = useRef<Map<string, PartRuntimeData>>(new Map());
  const [partsStateVersion, setPartsStateVersion] = useState(0);

  // Orbit control state
  const [cameraMode, setCameraMode] = useState<'orbit' | 'walkthrough'>('orbit');
  const walkthroughPos = useRef({
    x: project.roomDimensions.width * 0.55,
    y: 1550,
    z: project.roomDimensions.depth * 0.88,
    yaw: 0.82,
    pitch: -0.12
  });
  const isDraggingOrbit = useRef(false);
  const isDraggingModuleIn3D = useRef(false);
  const hasDraggedMouse = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraSpherical = useRef({ radius: 3600, theta: 0.85, phi: 1.15 });

  const selectedModule = project.modules.find((m) => m.id === selectedModuleId);
  const selectedModuleIndex = project.modules.findIndex((m) => m.id === selectedModuleId);
  const selectedPart = selectedPartId ? partsRegistry.current.get(selectedPartId) : null;

  // Configurations with sensible defaults
  const countertopConfig: CountertopConfig = project.countertopConfig || {
    enabled: project.hasCountertop ?? true,
    thickness: 38,
    depth: 600,
    material: 'Кварцевый агломерат Avant',
    color: 'Белый мрамор Калакатта',
    colorHex: '#e2e8f0',
    edgeProfile: 'Еврозапил'
  };

  const plinthConfig: PlinthConfig = project.plinthConfig || {
    enabled: project.hasPlinth ?? true,
    height: 100,
    material: 'МДФ в цвет фасада',
    color: 'Черный матовый',
    colorHex: '#18181b'
  };

  const backsplashConfig: BacksplashConfig = project.backsplashConfig || {
    enabled: true,
    type: 'камень',
    materialName: 'Кварц в цвет столешницы',
    colorHex: '#f1f5f9',
    height: 600
  };

  const updateModules = (newModules: FurnitureModule[]) => {
    onUpdateProject({
      ...project,
      modules: newModules
    });
  };

  // SMART WALL SNAP FUNCTION
  const snapModuleInRoom = (
    mod: FurnitureModule,
    targetX: number,
    targetY: number,
    targetZ: number,
    targetRot: number
  ): { x: number; y: number; z: number; rotation: number; message: string } => {
    let x = targetX;
    let y = targetY;
    let z = targetZ;
    let rot = targetRot;
    let message = '';

    const plinthH = plinthConfig.enabled ? plinthConfig.height : 0;
    const baseH = 720;
    const ctH = countertopConfig.enabled ? countertopConfig.thickness : 0;
    const bsH = backsplashConfig.enabled ? backsplashConfig.height : 600;
    const upperLineY = plinthH + baseH + ctH + bsH;

    // Corner recognition
    if (x < 350 && z < 350) {
      x = 0;
      z = 0;
      rot = 0;
      message = '✓ Угловая фиксация (стык стен 90°)';
    } else if (z < 250) {
      z = 0;
      rot = 0;
      message = '✓ Привязано к задней стене (Z = 0 мм)';
    } else if (x < 250) {
      x = 0;
      rot = 90;
      message = '✓ Привязано к левой стене (X = 0 мм)';
    } else if (x > project.roomDimensions.width - mod.depth - 250) {
      x = project.roomDimensions.width - mod.depth;
      rot = 270;
      message = '✓ Привязано к правой стене';
    }

    if (Math.abs(y - plinthH) < 40) {
      y = plinthH;
    } else if (Math.abs(y - upperLineY) < 40) {
      y = upperLineY;
    } else if (Math.abs(y) < 30) {
      y = 0;
    }

    project.modules.forEach((other) => {
      if (other.id === mod.id) return;
      if (rot === 0 && (other.rotation === 0 || !other.rotation)) {
        if (Math.abs(x - (other.x + other.width)) < 45) {
          x = other.x + other.width;
          y = other.y;
          message = `✓ Стык с «${other.name}»`;
        } else if (Math.abs(x + mod.width - other.x) < 45) {
          x = other.x - mod.width;
          y = other.y;
          message = `✓ Стык с «${other.name}»`;
        }
      } else if (rot === 90 && other.rotation === 90) {
        if (Math.abs(z - (other.z + other.width)) < 45) {
          z = other.z + other.width;
          y = other.y;
          message = `✓ Стык с «${other.name}»`;
        } else if (Math.abs(z + mod.width - other.z) < 45) {
          z = other.z - mod.width;
          y = other.y;
          message = `✓ Стык с «${other.name}»`;
        }
      }
    });

    x = Math.max(0, Math.min(project.roomDimensions.width - (rot === 90 ? mod.depth : mod.width), x));
    z = Math.max(0, Math.min(project.roomDimensions.depth - (rot === 90 ? mod.width : mod.depth), z));

    return { x, y, z, rotation: rot, message };
  };

  // COLLISION CHECK WHEN OPENING A DOOR OR DRAWER
  const checkPartCollision = (part: PartRuntimeData, willOpen: boolean): string | null => {
    if (!willOpen) return null;
    const parentMod = project.modules.find((m) => m.id === part.moduleId);
    if (!parentMod) return null;

    // 1. Door swinging into adjacent wall
    if (part.type === 'door' && part.openingType === 'распашной') {
      if (part.hingeSide === 'left' && parentMod.x < 40 && (!parentMod.rotation || parentMod.rotation === 0)) {
        return 'Фасад сталкивается с левой стеной помещения (нет зазора под открывание)';
      }
      if (part.hingeSide === 'left' && parentMod.rotation === 90 && parentMod.z < 40) {
        return 'Фасад сталкивается с задней стеной помещения при открытии';
      }
    }

    // 2. Drawer collision with open corner door or opposite cabinet
    if (part.type === 'drawer') {
      // Check if adjacent open door is blocking
      let blockingNeighbor = false;
      partsRegistry.current.forEach((otherPart) => {
        if (otherPart.moduleId !== part.moduleId && otherPart.isOpen && otherPart.type === 'door') {
          const otherMod = project.modules.find((m) => m.id === otherPart.moduleId);
          if (otherMod) {
            const dist = Math.abs(parentMod.x - otherMod.x);
            if (dist < parentMod.width + 100) {
              blockingNeighbor = true;
            }
          }
        }
      });
      if (blockingNeighbor) {
        return 'Выдвижной ящик сталкивается с открытым фасадом соседнего шкафа';
      }
    }

    return null;
  };

  // TOGGLE A SPECIFIC DOOR OR DRAWER INDIVIDUALLY
  const toggleIndividualPart = (partId: string) => {
    const part = partsRegistry.current.get(partId);
    if (!part) return;

    const nextOpen = !part.isOpen;
    const warning = checkPartCollision(part, nextOpen);

    part.isOpen = nextOpen;
    part.openProgress = nextOpen ? 1.0 : 0.0;
    setSelectedPartId(partId);

    if (warning) {
      setCollisionWarning(warning);
      setTimeout(() => setCollisionWarning(null), 4000);
    } else {
      setCollisionWarning(null);
    }

    // Persist in module partsState
    const parentMod = project.modules.find((m) => m.id === part.moduleId);
    if (parentMod) {
      const nextPartsState = {
        ...(parentMod.partsState || {}),
        [part.id]: {
          isOpen: nextOpen,
          openProgress: part.openProgress,
          openingType: part.openingType,
          hingeSide: part.hingeSide,
          maxAngle: part.maxAngle,
          maxSlide: part.maxSlide,
          runnerType: part.runnerType
        }
      };
      const updated = project.modules.map((m) =>
        m.id === parentMod.id ? { ...m, partsState: nextPartsState } : m
      );
      updateModules(updated);
    }

    setPartsStateVersion((v) => v + 1);
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNightMode ? 0x121417 : 0xf4f5f7);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 50, 18000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Physically-based interior lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff6ec, 0x505b68, 0.65);
    scene.add(hemiLight);

    // Sun directional light with soft penumbra shadows
    const dirLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
    dirLight.position.set(project.roomDimensions.width * 0.9, 3800, project.roomDimensions.depth * 0.85);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 100;
    dirLight.shadow.camera.far = 10000;
    dirLight.shadow.camera.left = -project.roomDimensions.width * 1.2;
    dirLight.shadow.camera.right = project.roomDimensions.width * 1.2;
    dirLight.shadow.camera.top = 4000;
    dirLight.shadow.camera.bottom = -500;
    dirLight.shadow.bias = -0.0002;
    scene.add(dirLight);

    // Natural daylight window fill light
    const windowLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    windowLight.position.set(project.roomDimensions.width + 600, 2000, project.roomDimensions.depth * 0.4);
    scene.add(windowLight);

    const spotLight1 = new THREE.SpotLight(0xfff5ea, 0.5, 6000, Math.PI / 4, 0.4);
    spotLight1.position.set(project.roomDimensions.width * 0.35, project.roomDimensions.height - 50, project.roomDimensions.depth * 0.4);
    scene.add(spotLight1);

    const spotLight2 = new THREE.SpotLight(0xfff5ea, 0.5, 6000, Math.PI / 4, 0.4);
    spotLight2.position.set(project.roomDimensions.width * 0.75, project.roomDimensions.height - 50, project.roomDimensions.depth * 0.4);
    scene.add(spotLight2);

    // Warm under-cabinet LED strip
    const ledStripLight = new THREE.PointLight(0xffd899, 0.65, 3000, 1.2);
    ledStripLight.position.set(project.roomDimensions.width / 2, 1420, 300);
    scene.add(ledStripLight);

    lightsRef.current = { dirLight, ambientLight, spotLight1, spotLight2, ledStripLight };

    // Realistic Room Architecture
    const roomWidth = project.roomDimensions.width;
    const roomHeight = project.roomDimensions.height;
    const roomDepth = project.roomDimensions.depth;

    // 1. Realistic Porcelain Tile Floor with subtle grout and reflection
    const floorGeo = new THREE.PlaneGeometry(roomWidth + 3000, roomDepth + 3000);
    const floorMat = new THREE.MeshStandardMaterial({
      map: getFloorTileTexture(),
      roughness: 0.32,
      metalness: 0.04
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(roomWidth / 2, 0, roomDepth / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Soft Ambient Occlusion Contact Shadow plane under cabinets
    const contactGeo = new THREE.PlaneGeometry(roomWidth + 200, 750);
    const contactMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.55
    });
    const contactShadowMesh = new THREE.Mesh(contactGeo, contactMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.set(roomWidth / 2, 0.8, 375);
    scene.add(contactShadowMesh);

    // 3. Architectural Walls with subtle warm plaster texture
    const wallMat = new THREE.MeshStandardMaterial({
      map: getWallTexture(),
      roughness: 0.88,
      metalness: 0.02
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth + 1000, roomHeight + 500), wallMat);
    backWall.position.set(roomWidth / 2, (roomHeight + 500) / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth + 1000, roomHeight + 500), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(0, (roomHeight + 500) / 2, (roomDepth + 1000) / 2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // 4. Architectural Perimeter Floor Baseboard (Плинтус)
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 80, 16), baseboardMat);
    bbBack.position.set(roomWidth / 2, 40, 8);
    bbBack.receiveShadow = true;
    scene.add(bbBack);

    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(16, 80, roomDepth), baseboardMat);
    bbLeft.position.set(8, 40, roomDepth / 2);
    bbLeft.receiveShadow = true;
    scene.add(bbLeft);

    // 5. Architectural Ceiling with recessed spotlight trims
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.9 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth + 2000, roomDepth + 2000), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(roomWidth / 2, roomHeight, roomDepth / 2);
    scene.add(ceiling);

    // 6. Architectural Window Frame and Sill on side
    const windowGroup = new THREE.Group();
    windowGroup.position.set(roomWidth + 10, 1000, roomDepth * 0.4);
    windowGroup.rotation.y = -Math.PI / 2;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.4 });
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1100, 30, 220), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    sill.position.set(0, -15, 100);
    windowGroup.add(sill);

    const wFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1050, 40, 40), frameMat);
    wFrameTop.position.set(0, 1400, 20);
    windowGroup.add(wFrameTop);

    const wFrameL = new THREE.Mesh(new THREE.BoxGeometry(40, 1400, 40), frameMat);
    wFrameL.position.set(-500, 700, 20);
    windowGroup.add(wFrameL);

    const wFrameR = new THREE.Mesh(new THREE.BoxGeometry(40, 1400, 40), frameMat);
    wFrameR.position.set(500, 700, 20);
    windowGroup.add(wFrameR);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.1
    });
    const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(960, 1340), glassMat);
    glassPane.position.set(0, 700, 20);
    windowGroup.add(glassPane);
    scene.add(windowGroup);

    const modulesGroup = new THREE.Group();
    scene.add(modulesGroup);
    modulesGroupRef.current = modulesGroup;

    const gizmoGroup = new THREE.Group();
    scene.add(gizmoGroup);
    gizmoGroupRef.current = gizmoGroup;

    // REALTIME 60 FPS ANIMATION LOOP FOR INDIVIDUAL DOORS & DRAWERS
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      // Smoothly interpolate each individual door & drawer
      partsRegistry.current.forEach((part) => {
        if (!part.threeGroup) return;

        // Smooth physics-like lerp towards openProgress (0.0 or 1.0)
        part.currentProgress += (part.openProgress - part.currentProgress) * 0.14;

        const p = part.currentProgress;

        if (part.openingType === 'выдвижной') {
          // Slide forward along local Z
          part.threeGroup.position.z = p * part.maxSlide;
        } else if (part.openingType === 'подъемный') {
          // Lift up around local X
          const rad = (part.maxAngle * Math.PI) / 180;
          part.threeGroup.rotation.x = -p * rad;
        } else if (part.openingType === 'откидной') {
          // Tilt down around local X
          const rad = (part.maxAngle * Math.PI) / 180;
          part.threeGroup.rotation.x = p * rad;
        } else if (part.openingType === 'раздвижной') {
          // Slide sideways along local X
          part.threeGroup.position.x = p * (part.maxSlide || 300);
        } else {
          // Standard swing door (распашной)
          const rad = (part.maxAngle * Math.PI) / 180;
          if (part.hingeSide === 'left') {
            part.threeGroup.rotation.y = -p * rad;
          } else {
            part.threeGroup.rotation.y = p * rad;
          }
        }
      });

      // Camera view update: Support both Walkthrough (eye-level 1600mm) and Orbit
      if (cameraMode === 'walkthrough') {
        const { x, y, z, yaw, pitch } = walkthroughPos.current;
        camera.position.set(x, y, z);
        const lookX = x + Math.sin(yaw) * Math.cos(pitch) * 1000;
        const lookY = y + Math.sin(pitch) * 1000;
        const lookZ = z - Math.cos(yaw) * Math.cos(pitch) * 1000;
        camera.lookAt(lookX, lookY, lookZ);
      } else {
        const target = new THREE.Vector3(roomWidth * 0.42, 950, roomDepth * 0.25);
        const { radius, theta, phi } = cameraSpherical.current;

        camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = target.y + radius * Math.cos(phi);
        camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(target);
      }

      renderer.render(scene, camera);
    };
    animate();

    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        hasDraggedMouse.current = false;
        if (interactionMode === 'move' && selectedModule) {
          isDraggingModuleIn3D.current = true;
        } else {
          isDraggingOrbit.current = true;
        }
        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const moveDistX = Math.abs(e.clientX - previousMousePosition.current.x);
      const moveDistY = Math.abs(e.clientY - previousMousePosition.current.y);
      if (moveDistX > 3 || moveDistY > 3) {
        hasDraggedMouse.current = true;
      }
      // 1. Raycast hover detection for interactive facade highlighting
      if (renderer && camera && modulesGroupRef.current) {
        const rect = dom.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(modulesGroupRef.current.children, true);
        let foundPartId: string | null = null;

        if (intersects.length > 0) {
          let curr: THREE.Object3D | null = intersects[0].object;
          while (curr && curr.parent) {
            if (curr.userData?.partId) {
              foundPartId = curr.userData.partId;
              break;
            }
            curr = curr.parent;
          }
        }

        if (foundPartId) {
          dom.style.cursor = 'pointer';
          setHoveredPartId(foundPartId);
        } else {
          dom.style.cursor = interactionMode === 'move' ? 'move' : 'default';
          setHoveredPartId(null);
        }
      }

      // 2. Module 3D Move Mode
      if (isDraggingModuleIn3D.current && selectedModule && camera && renderer) {
        const rect = dom.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(floorPlane, intersection);

        if (intersection) {
          const rawTargetX = Math.round(intersection.x - selectedModule.width / 2);
          const rawTargetZ = Math.round(intersection.z - selectedModule.depth / 2);

          const snapped = snapModuleInRoom(
            selectedModule,
            rawTargetX,
            selectedModule.y,
            rawTargetZ,
            selectedModule.rotation || 0
          );

          if (snapped.message) {
            setSnapFeedback(snapped.message);
          } else {
            setSnapFeedback(null);
          }

          const updated = project.modules.map((m) =>
            m.id === selectedModule.id
              ? { ...m, x: snapped.x, y: snapped.y, z: snapped.z, rotation: snapped.rotation }
              : m
          );
          onUpdateProject({ ...project, modules: updated });
        }
        return;
      }

      // 3. Camera Orbit or Walkthrough Look
      if (!isDraggingOrbit.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      if (cameraMode === 'walkthrough') {
        walkthroughPos.current.yaw -= deltaX * 0.005;
        walkthroughPos.current.pitch = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, walkthroughPos.current.pitch - deltaY * 0.005)
        );
      } else {
        cameraSpherical.current.theta -= deltaX * 0.006;
        cameraSpherical.current.phi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, cameraSpherical.current.phi - deltaY * 0.006)
        );
      }

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingOrbit.current = false;
      if (isDraggingModuleIn3D.current) {
        isDraggingModuleIn3D.current = false;
        setTimeout(() => setSnapFeedback(null), 2000);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraSpherical.current.radius = Math.max(
        1000,
        Math.min(9000, cameraSpherical.current.radius + e.deltaY * 2)
      );
    };

    // DIRECT 3D CLICK: SELECT CABINET OR TOGGLE INDIVIDUAL DOOR/DRAWER
    const handleClick = (e: MouseEvent) => {
      if (hasDraggedMouse.current) return;

      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      if (modulesGroupRef.current) {
        const intersects = raycaster.intersectObjects(modulesGroupRef.current.children, true);
        if (intersects.length > 0) {
          // Check if specific interactive part was clicked
          let clickedPartId: string | null = null;
          let clickedModuleId: string | null = null;

          let curr: THREE.Object3D | null = intersects[0].object;
          while (curr && curr.parent) {
            if (curr.userData?.partId && !clickedPartId) {
              clickedPartId = curr.userData.partId;
            }
            if (curr.userData?.moduleId && !clickedModuleId) {
              clickedModuleId = curr.userData.moduleId;
            }
            curr = curr.parent;
          }

          if (clickedModuleId) {
            setSelectedModuleId(clickedModuleId);
          }

          // If a specific door, drawer or detail was clicked:
          if (clickedPartId) {
            setSelectedPartId(clickedPartId);
            toggleIndividualPart(clickedPartId);
          } else {
            setSelectedPartId(null);
          }
        } else {
          // Clicked in empty room space -> deselect module and part
          setSelectedModuleId(null);
          setSelectedPartId(null);
        }
      }
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [project.roomDimensions, interactionMode, selectedModuleId]);

  // Lighting Day / Night toggle
  useEffect(() => {
    if (!lightsRef.current || !sceneRef.current) return;
    const { dirLight, ambientLight, spotLight1, spotLight2, ledStripLight } = lightsRef.current;

    if (isNightMode) {
      sceneRef.current.background = new THREE.Color(0x181a1f);
      ambientLight.intensity = 0.25;
      dirLight.intensity = 0.15;
      spotLight1.intensity = 1.4;
      spotLight2.intensity = 1.4;
      ledStripLight.intensity = 1.2;
    } else {
      sceneRef.current.background = new THREE.Color(0xf4f5f7);
      ambientLight.intensity = 0.7;
      dirLight.intensity = 0.85;
      spotLight1.intensity = 0.0;
      spotLight2.intensity = 0.0;
      ledStripLight.intensity = 0.0;
    }
  }, [isNightMode]);

  // BUILD 3D FURNITURE MESHES WITH INDIVIDUAL INTERACTIVE DOORS AND DRAWERS
  useEffect(() => {
    if (!modulesGroupRef.current) return;

    const group = modulesGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const plinthHeight = plinthConfig.enabled ? plinthConfig.height : 0;
    const countertopThickness = countertopConfig.enabled ? countertopConfig.thickness : 0;
    const ctDepth = countertopConfig.depth || 600;

    const backModules = project.modules.filter((m) => !m.rotation || m.rotation === 0 || m.rotation === 180);
    const leftModules = project.modules.filter((m) => m.rotation === 90 || m.wallAttachment === 'left');

    const backBaseModules = backModules.filter(
      (m) => m.y <= 250 && (m.category === 'НИЖНИЕ МОДУЛИ' || m.type.includes('base') || m.type.includes('appliance_dishwasher') || m.type.includes('corner_base'))
    );
    const leftBaseModules = leftModules.filter(
      (m) => m.y <= 250 && (m.category === 'НИЖНИЕ МОДУЛИ' || m.type.includes('base') || m.type.includes('appliance_dishwasher') || m.type.includes('corner_base'))
    );

    // 1. BACKSPLASH
    if (backsplashConfig.enabled) {
      const bsMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(backsplashConfig.colorHex),
        roughness: backsplashConfig.type === 'стекло' ? 0.1 : 0.6,
        metalness: backsplashConfig.type === 'стекло' ? 0.3 : 0.05
      });

      if (backBaseModules.length > 0) {
        const minX = Math.min(...backBaseModules.map((m) => m.x));
        const maxX = Math.max(...backBaseModules.map((m) => m.x + (m.type.includes('corner') ? m.width : m.width)));
        const bsW = Math.max(600, maxX - minX);

        const bsMesh = new THREE.Mesh(new THREE.BoxGeometry(bsW, backsplashConfig.height, 10), bsMat);
        bsMesh.position.set(
          minX + bsW / 2,
          plinthHeight + 720 + countertopThickness + backsplashConfig.height / 2,
          5
        );
        bsMesh.receiveShadow = true;
        group.add(bsMesh);
      }

      if (leftBaseModules.length > 0) {
        const minZ = Math.min(...leftBaseModules.map((m) => m.z));
        const maxZ = Math.max(...leftBaseModules.map((m) => m.z + m.width));
        const bsL = Math.max(600, maxZ - minZ);

        const bsLeftMesh = new THREE.Mesh(new THREE.BoxGeometry(10, backsplashConfig.height, bsL), bsMat);
        bsLeftMesh.position.set(
          5,
          plinthHeight + 720 + countertopThickness + backsplashConfig.height / 2,
          minZ + bsL / 2
        );
        bsLeftMesh.receiveShadow = true;
        group.add(bsLeftMesh);
      }
    }

    // 2. RENDER CABINET MODULES AND REGISTER INDIVIDUAL DOORS/DRAWERS
    project.modules.forEach((mod) => {
      const modGroup = new THREE.Group();
      modGroup.userData = { moduleId: mod.id };

      const isSelected = mod.id === selectedModuleId;
      const w = mod.width;
      const h = mod.height;
      const d = mod.depth;

      // PBR Materials for this module
      const isWood =
        (mod.facadeMaterial && /дуб|орех|ясень|дерево|лдсп/i.test(mod.facadeMaterial)) ||
        mod.facadeTexture === 'Дерево';

      const woodMap = isWood ? getWoodTexture(facadeHex) : null;

      const carcassMat = new THREE.MeshStandardMaterial({
        color: 0xf5f6f8,
        roughness: 0.5,
        metalness: 0.04
      });

      const facadeMat = new THREE.MeshStandardMaterial({
        color: isWood ? 0xffffff : new THREE.Color(facadeHex),
        map: woodMap || undefined,
        roughness: isWood ? 0.46 : mod.facadeTexture === 'Глянец' ? 0.08 : 0.42,
        metalness: mod.facadeTexture === 'Глянец' ? 0.12 : 0.02
      });

      const handleMat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.22,
        metalness: 0.92
      });

      const hardwareMat = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.2,
        metalness: 0.95
      });

      const drawerSideMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.35,
        metalness: 0.75
      });

      // Helper to build realistic architectural bar handle
      const createBarHandle = (length: number, isVertical: boolean = true) => {
        const hGroup = new THREE.Group();
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, length, 16), handleMat);
        if (!isVertical) rod.rotation.z = Math.PI / 2;
        rod.position.set(0, 0, 16);
        rod.castShadow = true;
        hGroup.add(rod);

        const postGeo = new THREE.CylinderGeometry(4, 4, 16, 16);
        const post1 = new THREE.Mesh(postGeo, handleMat);
        post1.rotation.x = Math.PI / 2;
        const post2 = new THREE.Mesh(postGeo, handleMat);
        post2.rotation.x = Math.PI / 2;

        const halfDist = length * 0.38;
        if (isVertical) {
          post1.position.set(0, -halfDist, 8);
          post2.position.set(0, halfDist, 8);
        } else {
          post1.position.set(-halfDist, 0, 8);
          post2.position.set(halfDist, 0, 8);
        }
        hGroup.add(post1);
        hGroup.add(post2);
        return hGroup;
      };

      // Helper to build realistic Blum-style concealed hinge
      const createBlumHingeMesh = (hingeSide: 'left' | 'right') => {
        const hGroup = new THREE.Group();
        const arm = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 36), hardwareMat);
        arm.position.set(hingeSide === 'left' ? 6 : -6, 0, -18);
        hGroup.add(arm);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 8, 16), hardwareMat);
        cup.rotation.x = Math.PI / 2;
        cup.position.set(0, 0, 4);
        hGroup.add(cup);
        return hGroup;
      };

      // Realistic Hollow Euro Carcass Body
      if (!mod.isAppliance) {
        const carcassBodyGroup = new THREE.Group();
        const cDepth = d - 22; // front recessed for facade

        // Left Panel (18mm)
        const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(18, h, cDepth), carcassMat);
        leftPanel.position.set(9, h / 2, cDepth / 2);
        leftPanel.castShadow = true;
        leftPanel.receiveShadow = true;
        carcassBodyGroup.add(leftPanel);

        // Right Panel (18mm)
        const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(18, h, cDepth), carcassMat);
        rightPanel.position.set(w - 9, h / 2, cDepth / 2);
        rightPanel.castShadow = true;
        rightPanel.receiveShadow = true;
        carcassBodyGroup.add(rightPanel);

        // Bottom Horizon (18mm)
        const bottomPanel = new THREE.Mesh(new THREE.BoxGeometry(w - 36, 18, cDepth), carcassMat);
        bottomPanel.position.set(w / 2, 9, cDepth / 2);
        bottomPanel.receiveShadow = true;
        carcassBodyGroup.add(bottomPanel);

        // Top Horizon or Base Stretchers
        if (mod.category === 'НИЖНИЕ МОДУЛИ' || mod.type.includes('base')) {
          // Front stretcher
          const frontTie = new THREE.Mesh(new THREE.BoxGeometry(w - 36, 18, 80), carcassMat);
          frontTie.position.set(w / 2, h - 9, cDepth - 40);
          carcassBodyGroup.add(frontTie);
          // Rear stretcher
          const rearTie = new THREE.Mesh(new THREE.BoxGeometry(w - 36, 80, 18), carcassMat);
          rearTie.position.set(w / 2, h - 40, 9);
          carcassBodyGroup.add(rearTie);
        } else {
          // Full top panel for wall and tall cabinets
          const topPanel = new THREE.Mesh(new THREE.BoxGeometry(w - 36, 18, cDepth), carcassMat);
          topPanel.position.set(w / 2, h - 9, cDepth / 2);
          carcassBodyGroup.add(topPanel);
        }

        // Back Wall (HDF 4mm in groove)
        const backWallHdf = new THREE.Mesh(
          new THREE.BoxGeometry(w - 12, h - 12, 4),
          new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.7 })
        );
        backWallHdf.position.set(w / 2, h / 2, 2);
        backWallHdf.receiveShadow = true;
        carcassBodyGroup.add(backWallHdf);

        // Internal Shelves with Realistic Shelf Support Pins
        if (mod.shelvesCount > 0) {
          const shelfStep = h / (mod.shelvesCount + 1);
          for (let s = 1; s <= mod.shelvesCount; s++) {
            const shelfMesh = new THREE.Mesh(
              new THREE.BoxGeometry(w - 36, 18, cDepth - 20),
              carcassMat
            );
            shelfMesh.position.set(w / 2, s * shelfStep, (cDepth - 20) / 2 + 8);
            shelfMesh.castShadow = true;
            shelfMesh.receiveShadow = true;
            carcassBodyGroup.add(shelfMesh);

            // 4 Shelf pins (полкодержатели)
            const pinGeo = new THREE.CylinderGeometry(2.5, 2.5, 8, 8);
            [-1, 1].forEach((side) => {
              const px = side === -1 ? 18 + 4 : w - 18 - 4;
              [-1, 1].forEach((frontBack) => {
                const pz = cDepth / 2 + frontBack * (cDepth * 0.35);
                const pin = new THREE.Mesh(pinGeo, hardwareMat);
                pin.position.set(px, s * shelfStep - 5, pz);
                carcassBodyGroup.add(pin);
              });
            });
          }
        }

        // Mounted drawer telescopic runner rails inside carcass if module has drawers
        if (mod.drawersCount > 0) {
          const drwH = (h - 6 * mod.drawersCount) / mod.drawersCount;
          for (let i = 0; i < mod.drawersCount; i++) {
            const runnerY = i * (drwH + 4) + drwH * 0.35;
            const runnerL = new THREE.Mesh(new THREE.BoxGeometry(8, 20, cDepth - 40), hardwareMat);
            runnerL.position.set(22, runnerY, cDepth / 2);
            carcassBodyGroup.add(runnerL);

            const runnerR = new THREE.Mesh(new THREE.BoxGeometry(8, 20, cDepth - 40), hardwareMat);
            runnerR.position.set(w - 22, runnerY, cDepth / 2);
            carcassBodyGroup.add(runnerR);
          }
        }

        modGroup.add(carcassBodyGroup);
      }

      // REGISTER AND BUILD INDIVIDUAL DOORS AND DRAWERS
      const facadeGroup = new THREE.Group();

      if (mod.isAppliance) {
        if (mod.applianceType === 'fridge') {
          const fridgeBody = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 })
          );
          fridgeBody.position.set(w / 2, h / 2, d / 2);
          modGroup.add(fridgeBody);

          // Top Fridge Door
          const topDoorId = `${mod.id}-door-fridge-top`;
          const topState = mod.partsState?.[topDoorId] || { isOpen: false, openProgress: 0 };
          const topHinge = new THREE.Group();
          topHinge.position.set(w - 4, h * 0.4, d);

          const topDoorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(w - 8, h * 0.58, 24),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
          );
          topDoorMesh.position.set(-(w - 8) / 2, (h * 0.58) / 2, 12);
          topDoorMesh.userData = { partId: topDoorId, moduleId: mod.id };
          topHinge.add(topDoorMesh);

          const topHandle = new THREE.Mesh(new THREE.BoxGeometry(16, 200, 20), handleMat);
          topHandle.position.set(-(w - 8) + 30, (h * 0.58) / 2, 28);
          topHandle.userData = { partId: topDoorId, moduleId: mod.id };
          topHinge.add(topHandle);

          facadeGroup.add(topHinge);
          partsRegistry.current.set(topDoorId, {
            id: topDoorId,
            moduleId: mod.id,
            name: 'Холодильная камера (Верх)',
            type: 'door',
            openingType: 'распашной',
            hingeSide: 'right',
            maxAngle: 110,
            maxSlide: 0,
            isOpen: topState.isOpen,
            openProgress: topState.openProgress || 0,
            currentProgress: topState.openProgress || 0,
            threeGroup: topHinge,
            meshObject: topDoorMesh
          });

          // Bottom Freezer Door
          const bottomDoorId = `${mod.id}-door-fridge-bottom`;
          const bottomState = mod.partsState?.[bottomDoorId] || { isOpen: false, openProgress: 0 };
          const bottomHinge = new THREE.Group();
          bottomHinge.position.set(w - 4, 4, d);

          const bottomDoorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(w - 8, h * 0.38, 24),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 })
          );
          bottomDoorMesh.position.set(-(w - 8) / 2, (h * 0.38) / 2, 12);
          bottomDoorMesh.userData = { partId: bottomDoorId, moduleId: mod.id };
          bottomHinge.add(bottomDoorMesh);

          const bottomHandle = new THREE.Mesh(new THREE.BoxGeometry(16, 140, 20), handleMat);
          bottomHandle.position.set(-(w - 8) + 30, (h * 0.38) * 0.7, 28);
          bottomHandle.userData = { partId: bottomDoorId, moduleId: mod.id };
          bottomHinge.add(bottomHandle);

          facadeGroup.add(bottomHinge);
          partsRegistry.current.set(bottomDoorId, {
            id: bottomDoorId,
            moduleId: mod.id,
            name: 'Морозильная камера (Низ)',
            type: 'door',
            openingType: 'распашной',
            hingeSide: 'right',
            maxAngle: 110,
            maxSlide: 0,
            isOpen: bottomState.isOpen,
            openProgress: bottomState.openProgress || 0,
            currentProgress: bottomState.openProgress || 0,
            threeGroup: bottomHinge,
            meshObject: bottomDoorMesh
          });
        } else if (mod.applianceType === 'dishwasher') {
          // Dishwasher with tilt-down front
          const dwDoorId = `${mod.id}-door-dw`;
          const dwState = mod.partsState?.[dwDoorId] || { isOpen: false, openProgress: 0 };
          const dwHinge = new THREE.Group();
          dwHinge.position.set(0, 4, d);

          const dwDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 4, h - 6, 20), facadeMat);
          dwDoorMesh.position.set(w / 2, (h - 6) / 2, 10);
          dwDoorMesh.userData = { partId: dwDoorId, moduleId: mod.id };
          dwHinge.add(dwDoorMesh);

          const dwHandle = new THREE.Mesh(new THREE.BoxGeometry(160, 16, 24), handleMat);
          dwHandle.position.set(w / 2, h - 30, 24);
          dwHandle.userData = { partId: dwDoorId, moduleId: mod.id };
          dwHinge.add(dwHandle);

          facadeGroup.add(dwHinge);
          partsRegistry.current.set(dwDoorId, {
            id: dwDoorId,
            moduleId: mod.id,
            name: 'Фасад посудомоечной машины',
            type: 'door',
            openingType: 'откидной',
            hingeSide: 'bottom',
            maxAngle: 85,
            maxSlide: 0,
            isOpen: dwState.isOpen,
            openProgress: dwState.openProgress || 0,
            currentProgress: dwState.openProgress || 0,
            threeGroup: dwHinge,
            meshObject: dwDoorMesh
          });
        } else if (mod.applianceType === 'oven') {
          // Oven body
          const ovenBody = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color: 0x1e293b })
          );
          ovenBody.position.set(w / 2, h / 2, d / 2);
          modGroup.add(ovenBody);

          // Oven tilt-down glass door
          const ovenDoorId = `${mod.id}-door-oven`;
          const ovenState = mod.partsState?.[ovenDoorId] || { isOpen: false, openProgress: 0 };
          const ovenHinge = new THREE.Group();
          ovenHinge.position.set(0, 20, d);

          const ovenDoorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(w - 30, h - 60, 16),
            new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.9 })
          );
          ovenDoorMesh.position.set(w / 2, (h - 60) / 2, 8);
          ovenDoorMesh.userData = { partId: ovenDoorId, moduleId: mod.id };
          ovenHinge.add(ovenDoorMesh);

          const ovHandle = new THREE.Mesh(new THREE.BoxGeometry(w - 120, 16, 24), handleMat);
          ovHandle.position.set(w / 2, h - 80, 22);
          ovHandle.userData = { partId: ovenDoorId, moduleId: mod.id };
          ovenHinge.add(ovHandle);

          facadeGroup.add(ovenHinge);
          partsRegistry.current.set(ovenDoorId, {
            id: ovenDoorId,
            moduleId: mod.id,
            name: 'Дверца духового шкафа',
            type: 'door',
            openingType: 'откидной',
            hingeSide: 'bottom',
            maxAngle: 90,
            maxSlide: 0,
            isOpen: ovenState.isOpen,
            openProgress: ovenState.openProgress || 0,
            currentProgress: ovenState.openProgress || 0,
            threeGroup: ovenHinge,
            meshObject: ovenDoorMesh
          });
        } else if (mod.applianceType === 'cooktop') {
          const cooktopGeo = new THREE.BoxGeometry(w - 20, 15, d - 40);
          const cooktopMesh = new THREE.Mesh(cooktopGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.9 }));
          cooktopMesh.position.set(w / 2, 8, d / 2);
          modGroup.add(cooktopMesh);
        } else if (mod.applianceType === 'sink') {
          const basinMesh = new THREE.Mesh(new THREE.BoxGeometry(w - 40, 20, d - 40), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 }));
          basinMesh.position.set(w / 2, 10, d / 2);
          modGroup.add(basinMesh);
        } else {
          const appMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.7 }));
          appMesh.position.set(w / 2, h / 2, d / 2);
          modGroup.add(appMesh);
        }
      } else if (mod.glassFront) {
        // Vitrine glass door
        const vitrineId = `${mod.id}-door-vitrine`;
        const vitState = mod.partsState?.[vitrineId] || { isOpen: false, openProgress: 0 };
        const vitHinge = new THREE.Group();
        vitHinge.position.set(2, 2, d);

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          transparent: true,
          opacity: 0.45,
          roughness: 0.1,
          metalness: 0.8
        });
        const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(w - 4, h - 4, 12), glassMat);
        glassDoor.position.set((w - 4) / 2, (h - 4) / 2, 6);
        glassDoor.userData = { partId: vitrineId, moduleId: mod.id };
        vitHinge.add(glassDoor);

        const frameR = new THREE.Mesh(new THREE.BoxGeometry(14, 120, 16), handleMat);
        frameR.position.set(w - 30, (h - 4) / 2, 10);
        frameR.userData = { partId: vitrineId, moduleId: mod.id };
        vitHinge.add(frameR);

        facadeGroup.add(vitHinge);
        partsRegistry.current.set(vitrineId, {
          id: vitrineId,
          moduleId: mod.id,
          name: 'Витринный фасад (со стеклом)',
          type: 'door',
          openingType: 'распашной',
          hingeSide: 'left',
          maxAngle: 110,
          maxSlide: 0,
          isOpen: vitState.isOpen,
          openProgress: vitState.openProgress || 0,
          currentProgress: vitState.openProgress || 0,
          threeGroup: vitHinge,
          meshObject: glassDoor
        });
      } else if (mod.drawersCount > 0) {
        // INDIVIDUAL DRAWERS WITH REALISTIC SLIDING BOX & SIDES
        const drwH = (h - 6 * mod.drawersCount) / mod.drawersCount;
        for (let i = 0; i < mod.drawersCount; i++) {
          const drawerId = `${mod.id}-drawer-${i}`;
          const drawerState = mod.partsState?.[drawerId] || { isOpen: false, openProgress: 0 };
          const drawerGroup = new THREE.Group();
          drawerGroup.position.set(0, i * (drwH + 4) + 2, d);

          // 1. Facade Front Panel (19mm MDF with 2mm perimeter reveal margin)
          const drawerFront = new THREE.Mesh(new THREE.BoxGeometry(w - 4, drwH - 3, 19), facadeMat);
          drawerFront.position.set(w / 2, drwH / 2, 9.5);
          drawerFront.castShadow = true;
          drawerFront.userData = { partId: drawerId, moduleId: mod.id };
          drawerGroup.add(drawerFront);

          // 2. Realistic Sleek Bar Handle
          const handle = createBarHandle(Math.min(220, w - 80), false);
          handle.position.set(w / 2, drwH / 2, 19);
          handle.userData = { partId: drawerId, moduleId: mod.id };
          drawerGroup.add(handle);

          // 3. Complete Realistic Drawer Box (царги, дно, задняя стенка)
          const boxDepth = d - 70;
          const boxHeight = drwH * 0.65;

          // Left Metal Side Wall (царга)
          const sideL = new THREE.Mesh(new THREE.BoxGeometry(10, boxHeight, boxDepth), drawerSideMat);
          sideL.position.set(22, boxHeight / 2 + 6, -boxDepth / 2);
          drawerGroup.add(sideL);

          // Right Metal Side Wall (царга)
          const sideR = new THREE.Mesh(new THREE.BoxGeometry(10, boxHeight, boxDepth), drawerSideMat);
          sideR.position.set(w - 22, boxHeight / 2 + 6, -boxDepth / 2);
          drawerGroup.add(sideR);

          // Bottom Horizon Panel (16mm)
          const bottomBox = new THREE.Mesh(new THREE.BoxGeometry(w - 56, 16, boxDepth), carcassMat);
          bottomBox.position.set(w / 2, 8, -boxDepth / 2);
          drawerGroup.add(bottomBox);

          // Rear Steel/Wood Wall
          const backBox = new THREE.Mesh(new THREE.BoxGeometry(w - 56, boxHeight, 16), drawerSideMat);
          backBox.position.set(w / 2, boxHeight / 2 + 6, -boxDepth + 8);
          drawerGroup.add(backBox);

          facadeGroup.add(drawerGroup);
          partsRegistry.current.set(drawerId, {
            id: drawerId,
            moduleId: mod.id,
            name: `Выдвижной ящик ${i + 1}`,
            type: 'drawer',
            openingType: 'выдвижной',
            hingeSide: 'bottom',
            maxAngle: 0,
            maxSlide: Math.min(450, d - 80),
            isOpen: drawerState.isOpen,
            openProgress: drawerState.openProgress || 0,
            currentProgress: drawerState.openProgress || 0,
            runnerType: mod.runnerType || 'Blum Legrabox',
            threeGroup: drawerGroup,
            meshObject: drawerFront
          });
        }
      } else if (mod.facadesCount === 2) {
        // TWO-DOOR CABINET: LEFT DOOR & RIGHT DOOR OPEN INDEPENDENTLY WITH REAL BLUM HINGES
        const doorW = (w - 6) / 2;

        // 1. Left Door
        const leftDoorId = `${mod.id}-door-left`;
        const leftState = mod.partsState?.[leftDoorId] || { isOpen: false, openProgress: 0 };
        const leftHinge = new THREE.Group();
        leftHinge.position.set(2, 2, d);

        const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 4, 19), facadeMat);
        leftDoor.position.set(doorW / 2, (h - 4) / 2, 9.5);
        leftDoor.castShadow = true;
        leftDoor.userData = { partId: leftDoorId, moduleId: mod.id };
        leftHinge.add(leftDoor);

        // Blum hinges (top & bottom)
        const hingeTopL = createBlumHingeMesh('left');
        hingeTopL.position.set(0, h - 100, 0);
        leftHinge.add(hingeTopL);
        const hingeBotL = createBlumHingeMesh('left');
        hingeBotL.position.set(0, 100, 0);
        leftHinge.add(hingeBotL);

        // Architectural Bar Handle
        const handleL = createBarHandle(140, true);
        handleL.position.set(doorW - 25, (h - 4) / 2, 19);
        handleL.userData = { partId: leftDoorId, moduleId: mod.id };
        leftHinge.add(handleL);

        facadeGroup.add(leftHinge);
        partsRegistry.current.set(leftDoorId, {
          id: leftDoorId,
          moduleId: mod.id,
          name: 'Левый распашной фасад',
          type: 'door',
          openingType: 'распашной',
          hingeSide: 'left',
          maxAngle: 110,
          maxSlide: 0,
          isOpen: leftState.isOpen,
          openProgress: leftState.openProgress || 0,
          currentProgress: leftState.openProgress || 0,
          threeGroup: leftHinge,
          meshObject: leftDoor
        });

        // 2. Right Door
        const rightDoorId = `${mod.id}-door-right`;
        const rightState = mod.partsState?.[rightDoorId] || { isOpen: false, openProgress: 0 };
        const rightHinge = new THREE.Group();
        rightHinge.position.set(w - 2, 2, d);

        const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 4, 19), facadeMat);
        rightDoor.position.set(-doorW / 2, (h - 4) / 2, 9.5);
        rightDoor.castShadow = true;
        rightDoor.userData = { partId: rightDoorId, moduleId: mod.id };
        rightHinge.add(rightDoor);

        // Blum hinges (top & bottom)
        const hingeTopR = createBlumHingeMesh('right');
        hingeTopR.position.set(0, h - 100, 0);
        rightHinge.add(hingeTopR);
        const hingeBotR = createBlumHingeMesh('right');
        hingeBotR.position.set(0, 100, 0);
        rightHinge.add(hingeBotR);

        // Architectural Bar Handle
        const handleR = createBarHandle(140, true);
        handleR.position.set(-doorW + 25, (h - 4) / 2, 19);
        handleR.userData = { partId: rightDoorId, moduleId: mod.id };
        rightHinge.add(handleR);

        facadeGroup.add(rightHinge);
        partsRegistry.current.set(rightDoorId, {
          id: rightDoorId,
          moduleId: mod.id,
          name: 'Правый распашной фасад',
          type: 'door',
          openingType: 'распашной',
          hingeSide: 'right',
          maxAngle: 110,
          maxSlide: 0,
          isOpen: rightState.isOpen,
          openProgress: rightState.openProgress || 0,
          currentProgress: rightState.openProgress || 0,
          threeGroup: rightHinge,
          meshObject: rightDoor
        });
      } else if (mod.type.includes('hood')) {
        // Lift-up Aventos facade for hood/upper lift cabinet
        const liftDoorId = `${mod.id}-door-lift`;
        const liftState = mod.partsState?.[liftDoorId] || { isOpen: false, openProgress: 0 };
        const liftHinge = new THREE.Group();
        liftHinge.position.set(0, h - 2, d);

        const liftDoor = new THREE.Mesh(new THREE.BoxGeometry(w - 4, h - 4, 19), facadeMat);
        liftDoor.position.set(w / 2, -(h - 4) / 2, 9.5);
        liftDoor.castShadow = true;
        liftDoor.userData = { partId: liftDoorId, moduleId: mod.id };
        liftHinge.add(liftDoor);

        const handleLift = createBarHandle(Math.min(180, w - 80), false);
        handleLift.position.set(w / 2, -(h - 4) + 30, 19);
        handleLift.userData = { partId: liftDoorId, moduleId: mod.id };
        liftHinge.add(handleLift);

        facadeGroup.add(liftHinge);
        partsRegistry.current.set(liftDoorId, {
          id: liftDoorId,
          moduleId: mod.id,
          name: 'Подъемный фасад (Aventos)',
          type: 'door',
          openingType: 'подъемный',
          hingeSide: 'top',
          maxAngle: 95,
          maxSlide: 0,
          isOpen: liftState.isOpen,
          openProgress: liftState.openProgress || 0,
          currentProgress: liftState.openProgress || 0,
          threeGroup: liftHinge,
          meshObject: liftDoor
        });
      } else if (mod.facadesCount === 1) {
        // SINGLE DOOR
        const singleDoorId = `${mod.id}-door-0`;
        const singleState = mod.partsState?.[singleDoorId] || { isOpen: false, openProgress: 0 };
        const singleHinge = new THREE.Group();
        singleHinge.position.set(2, 2, d);

        const door = new THREE.Mesh(new THREE.BoxGeometry(w - 4, h - 4, 19), facadeMat);
        door.position.set((w - 4) / 2, (h - 4) / 2, 9.5);
        door.castShadow = true;
        door.userData = { partId: singleDoorId, moduleId: mod.id };
        singleHinge.add(door);

        // Blum hinges
        const hingeTop = createBlumHingeMesh('left');
        hingeTop.position.set(0, h - 100, 0);
        singleHinge.add(hingeTop);
        const hingeBot = createBlumHingeMesh('left');
        hingeBot.position.set(0, 100, 0);
        singleHinge.add(hingeBot);

        // Architectural Bar Handle
        const handle = createBarHandle(140, true);
        handle.position.set(w - 35, (h - 4) / 2, 19);
        handle.userData = { partId: singleDoorId, moduleId: mod.id };
        singleHinge.add(handle);

        facadeGroup.add(singleHinge);
        partsRegistry.current.set(singleDoorId, {
          id: singleDoorId,
          moduleId: mod.id,
          name: 'Распашной фасад',
          type: 'door',
          openingType: 'распашной',
          hingeSide: 'left',
          maxAngle: 110,
          maxSlide: 0,
          isOpen: singleState.isOpen,
          openProgress: singleState.openProgress || 0,
          currentProgress: singleState.openProgress || 0,
          threeGroup: singleHinge,
          meshObject: door
        });
      }

      modGroup.add(facadeGroup);

      // Selection Wireframe Outline
      if (isSelected) {
        const wireGeo = new THREE.BoxGeometry(w + 12, h + 12, d + 12);
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0xc26d45,
          wireframe: true
        });
        const wireMesh = new THREE.Mesh(wireGeo, wireMat);
        wireMesh.position.set(w / 2, h / 2, d / 2);
        modGroup.add(wireMesh);
      }

      // Multi-wall orientation
      const rot = mod.rotation || 0;
      if (rot === 90) {
        modGroup.position.set(mod.x, mod.y, mod.z + w);
        modGroup.rotation.y = -Math.PI / 2;
      } else if (rot === 270) {
        modGroup.position.set(mod.x + d, mod.y, mod.z);
        modGroup.rotation.y = Math.PI / 2;
      } else if (rot === 180) {
        modGroup.position.set(mod.x + w, mod.y, mod.z + d);
        modGroup.rotation.y = Math.PI;
      } else {
        modGroup.position.set(mod.x, mod.y, mod.z);
        modGroup.rotation.y = 0;
      }

      group.add(modGroup);
    });

    // 3. REALISTIC COUNTERTOP WITH PBR QUARTZ/MARBLE TEXTURE
    if (countertopConfig.enabled && (backBaseModules.length > 0 || leftBaseModules.length > 0)) {
      const isMarble =
        countertopConfig.material?.toLowerCase().includes('мрамор') ||
        countertopConfig.color?.toLowerCase().includes('мрамор') ||
        countertopConfig.color?.toLowerCase().includes('калакатта');

      const ctTexture = getStoneTexture(
        countertopConfig.colorHex,
        '#94a3b8',
        isMarble ? 'marble' : 'quartz'
      );

      const ctMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: ctTexture,
        roughness: 0.16,
        metalness: 0.04
      });

      if (backBaseModules.length > 0) {
        const minX = Math.min(...backBaseModules.map((m) => m.x));
        const maxX = Math.max(...backBaseModules.map((m) => m.x + (m.type.includes('corner') ? m.width : m.width)));
        const ctW = maxX - minX;

        const ctMesh = new THREE.Mesh(new THREE.BoxGeometry(ctW, countertopThickness, ctDepth), ctMat);
        ctMesh.position.set(minX + ctW / 2, plinthHeight + 720 + countertopThickness / 2, ctDepth / 2);
        ctMesh.castShadow = true;
        ctMesh.receiveShadow = true;
        group.add(ctMesh);
      }

      if (leftBaseModules.length > 0) {
        const minZ = Math.min(...leftBaseModules.map((m) => m.z));
        const maxZ = Math.max(...leftBaseModules.map((m) => m.z + m.width));
        const ctL = maxZ - Math.max(ctDepth, minZ);

        if (ctL > 0) {
          const ctLeftMesh = new THREE.Mesh(new THREE.BoxGeometry(ctDepth, countertopThickness, ctL), ctMat);
          ctLeftMesh.position.set(ctDepth / 2, plinthHeight + 720 + countertopThickness / 2, Math.max(ctDepth, minZ) + ctL / 2);
          ctLeftMesh.castShadow = true;
          ctLeftMesh.receiveShadow = true;
          group.add(ctLeftMesh);
        }
      }
    }

    // 4. REALISTIC TOE KICK / PLINTH (recessed 60mm back)
    if (plinthConfig.enabled) {
      const plinthMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(plinthConfig.colorHex),
        roughness: 0.38,
        metalness: 0.3
      });

      if (backBaseModules.length > 0) {
        const minX = Math.min(...backBaseModules.map((m) => m.x));
        const maxX = Math.max(...backBaseModules.map((m) => m.x + m.width));
        const plW = maxX - minX;

        const plinthMesh = new THREE.Mesh(new THREE.BoxGeometry(plW, plinthHeight, 20), plinthMat);
        plinthMesh.position.set(minX + plW / 2, plinthHeight / 2, ctDepth - 80);
        group.add(plinthMesh);
      }

      if (leftBaseModules.length > 0) {
        const minZ = Math.min(...leftBaseModules.map((m) => m.z));
        const maxZ = Math.max(...leftBaseModules.map((m) => m.z + m.width));
        const plL = maxZ - Math.max(ctDepth - 80, minZ);

        if (plL > 0) {
          const plinthLeft = new THREE.Mesh(new THREE.BoxGeometry(20, plinthHeight, plL), plinthMat);
          plinthLeft.position.set(ctDepth - 80, plinthHeight / 2, Math.max(ctDepth - 80, minZ) + plL / 2);
          group.add(plinthLeft);
        }
      }
    }
  }, [
    project.modules,
    selectedModuleId,
    countertopConfig,
    plinthConfig,
    backsplashConfig
  ]);

  // 3D TRANSFORM GIZMO VISUAL UPDATE
  useEffect(() => {
    if (!gizmoGroupRef.current) return;
    const gizmo = gizmoGroupRef.current;
    while (gizmo.children.length > 0) {
      gizmo.remove(gizmo.children[0]);
    }

    if (!selectedModule) return;

    const w = selectedModule.width;
    const h = selectedModule.height;
    const d = selectedModule.depth;
    const rot = selectedModule.rotation || 0;

    let centerX = selectedModule.x + w / 2;
    let centerY = selectedModule.y + h / 2;
    let centerZ = selectedModule.z + d / 2;

    if (rot === 90) {
      centerX = selectedModule.x + d / 2;
      centerZ = selectedModule.z + w / 2;
    }

    gizmo.position.set(centerX, centerY, centerZ);

    const xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 280, 0xef4444, 60, 30);
    gizmo.add(xArrow);

    const yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 280, 0x10b981, 60, 30);
    gizmo.add(yArrow);

    const zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 280, 0x3b82f6, 60, 30);
    gizmo.add(zArrow);

    const rotRing = new THREE.Mesh(
      new THREE.RingGeometry(220, 230, 32),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide })
    );
    rotRing.rotation.x = Math.PI / 2;
    gizmo.add(rotRing);
  }, [selectedModule]);

  // Update opening settings for selected part
  const handleUpdatePartSettings = (updates: Partial<PartRuntimeData>) => {
    if (!selectedPart) return;
    Object.assign(selectedPart, updates);

    const parentMod = project.modules.find((m) => m.id === selectedPart.moduleId);
    if (parentMod) {
      const nextPartsState = {
        ...(parentMod.partsState || {}),
        [selectedPart.id]: {
          isOpen: selectedPart.isOpen,
          openProgress: selectedPart.openProgress,
          openingType: selectedPart.openingType,
          hingeSide: selectedPart.hingeSide,
          maxAngle: selectedPart.maxAngle,
          maxSlide: selectedPart.maxSlide,
          runnerType: selectedPart.runnerType
        }
      };
      const updated = project.modules.map((m) =>
        m.id === parentMod.id ? { ...m, partsState: nextPartsState } : m
      );
      updateModules(updated);
    }
    setPartsStateVersion((v) => v + 1);
  };

  // Quick action helpers
  const handleRotate90 = () => {
    if (!selectedModule) return;
    const currentRot = selectedModule.rotation || 0;
    const nextRot = (currentRot + 90) % 360;

    const updated = project.modules.map((m) =>
      m.id === selectedModule.id ? { ...m, rotation: nextRot } : m
    );
    updateModules(updated);
    setSnapFeedback(`Повернуто на 90° (${nextRot}°)`);
    setTimeout(() => setSnapFeedback(null), 2000);
  };

  const handleSnapToWall = () => {
    if (!selectedModule) return;
    const x = selectedModule.x;
    const z = selectedModule.z;

    let targetRot = 0;
    let targetX = x;
    let targetZ = 0;

    if (x < z) {
      targetX = 0;
      targetZ = z;
      targetRot = 90;
      setSnapFeedback('✓ Привязано к левой стене (X = 0 мм)');
    } else {
      targetX = x;
      targetZ = 0;
      targetRot = 0;
      setSnapFeedback('✓ Привязано к задней стене (Z = 0 мм)');
    }

    const updated = project.modules.map((m) =>
      m.id === selectedModule.id ? { ...m, x: targetX, z: targetZ, rotation: targetRot } : m
    );
    updateModules(updated);
    setTimeout(() => setSnapFeedback(null), 2500);
  };

  const handlePlaceInCorner = () => {
    if (!selectedModule) return;
    const updated = project.modules.map((m) =>
      m.id === selectedModule.id ? { ...m, x: 0, z: 0, rotation: 0 } : m
    );
    updateModules(updated);
    setSnapFeedback('✓ Размещено в углу (X = 0, Z = 0)');
    setTimeout(() => setSnapFeedback(null), 2500);
  };

  const handleAlignWithAdjacent = () => {
    if (!selectedModule) return;
    const rot = selectedModule.rotation || 0;
    let bestDist = Infinity;
    let alignTargetX = selectedModule.x;
    let alignTargetZ = selectedModule.z;
    let alignTargetY = selectedModule.y;
    let neighborName = '';

    project.modules.forEach((other) => {
      if (other.id === selectedModule.id) return;
      if (rot === (other.rotation || 0)) {
        if (rot === 0) {
          const d1 = Math.abs(selectedModule.x - (other.x + other.width));
          const d2 = Math.abs(selectedModule.x + selectedModule.width - other.x);
          if (d1 < bestDist) {
            bestDist = d1;
            alignTargetX = other.x + other.width;
            alignTargetY = other.y;
            neighborName = other.name;
          }
          if (d2 < bestDist) {
            bestDist = d2;
            alignTargetX = other.x - selectedModule.width;
            alignTargetY = other.y;
            neighborName = other.name;
          }
        } else if (rot === 90) {
          const d1 = Math.abs(selectedModule.z - (other.z + other.width));
          const d2 = Math.abs(selectedModule.z + selectedModule.width - other.z);
          if (d1 < bestDist) {
            bestDist = d1;
            alignTargetZ = other.z + other.width;
            alignTargetY = other.y;
            neighborName = other.name;
          }
          if (d2 < bestDist) {
            bestDist = d2;
            alignTargetZ = other.z - selectedModule.width;
            alignTargetY = other.y;
            neighborName = other.name;
          }
        }
      }
    });

    if (neighborName) {
      const updated = project.modules.map((m) =>
        m.id === selectedModule.id
          ? { ...m, x: alignTargetX, y: alignTargetY, z: alignTargetZ }
          : m
      );
      updateModules(updated);
      setSnapFeedback(`✓ Выровнено встык с «${neighborName}»`);
    } else {
      setSnapFeedback('Соседний модуль не найден');
    }
    setTimeout(() => setSnapFeedback(null), 2500);
  };

  const handleDuplicate = () => {
    if (!selectedModule) return;
    const rot = selectedModule.rotation || 0;
    const newMod: FurnitureModule = {
      ...selectedModule,
      id: 'mod-' + Date.now(),
      name: `${selectedModule.name} (Копия)`,
      x: rot === 90 ? selectedModule.x : selectedModule.x + selectedModule.width,
      z: rot === 90 ? selectedModule.z + selectedModule.width : selectedModule.z,
      partsState: undefined
    };
    const updated = [...project.modules, newMod];
    updateModules(updated);
    setSelectedModuleId(newMod.id);
    setSnapFeedback('✓ Модуль дублирован');
    setTimeout(() => setSnapFeedback(null), 2000);
  };

  const handleDelete = () => {
    if (!selectedModule) return;
    const updated = project.modules.filter((m) => m.id !== selectedModule.id);
    updateModules(updated);
    setSelectedModuleId(updated[0]?.id || null);
    setSelectedPartId(null);
    setSnapFeedback('Модуль удален');
    setTimeout(() => setSnapFeedback(null), 2000);
  };

  const handleStepCoord = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedModule) return;
    const currentVal = selectedModule[axis] || 0;
    const nextVal = Math.max(0, currentVal + delta);
    const updated = project.modules.map((m) =>
      m.id === selectedModule.id ? { ...m, [axis]: nextVal } : m
    );
    updateModules(updated);
  };

  const handleAddModuleIn3D = (template: ModuleTemplate) => {
    const isUpper =
      template.subCategory === 'ВЕРХНИЕ МОДУЛИ' ||
      template.type.includes('wall') ||
      template.applianceType === 'hood';

    const plinthH = plinthConfig.enabled ? plinthConfig.height : 0;
    const baseH = 720;
    const ctH = countertopConfig.enabled ? countertopConfig.thickness : 0;
    const bsH = backsplashConfig.enabled ? backsplashConfig.height : 600;
    const upperY = plinthH + baseH + ctH + bsH;

    let targetX = 0;
    let targetZ = 0;
    let targetRot = 0;

    const sameLevel = project.modules.filter((m) => (isUpper ? m.y > 1000 : m.y < 500));
    if (sameLevel.length > 0) {
      const rightmost = sameLevel.reduce((max, m) => Math.max(max, m.x + m.width), 0);
      if (rightmost + template.width <= project.roomDimensions.width) {
        targetX = rightmost;
      } else {
        targetX = 0;
        targetZ = 900;
        targetRot = 90;
      }
    }

    const newMod: FurnitureModule = {
      id: 'mod-' + Date.now(),
      name: template.name,
      category: template.subCategory as any,
      type: template.type,
      x: targetX,
      y: isUpper ? upperY : plinthH,
      z: targetZ,
      rotation: targetRot,
      width: template.width,
      height: template.height,
      depth: template.depth,
      shelvesCount: template.shelvesCount,
      facadesCount: template.facadesCount,
      drawersCount: template.drawersCount,
      carcassMaterial: 'ЛДСП 18 мм Белый Базовый',
      carcassThickness: 18,
      facadeMaterial: 'МДФ 19 мм Эмаль Матовая',
      facadeThickness: 19,
      facadeColor: 'Кашемир матовый',
      facadeColorHex: template.defaultColorHex,
      facadeTexture: 'Матовая',
      backWallMaterial: 'ХДФ 3 мм',
      handleType: 'Профиль Gola черный',
      hingeType: 'Blum Clip-Top с доводчиком',
      runnerType: template.drawersCount > 0 ? 'Blum Legrabox' : '—',
      isAppliance: template.isAppliance,
      applianceType: template.applianceType,
      glassFront: template.glassFront,
      cutoutType: template.cutoutType || 'none',
      doorsOpen: false
    };

    const updated = [...project.modules, newMod];
    updateModules(updated);
    setSelectedModuleId(newMod.id);
    setSnapFeedback(`✓ Добавлен модуль «${template.name}»`);
    setTimeout(() => setSnapFeedback(null), 2500);
  };

  const handleLoadLShapedDemo = () => {
    const lProject = INITIAL_PROJECTS.find((p) => p.id === 'proj-kitchen-l');
    if (lProject) {
      onUpdateProject({
        ...project,
        kitchenType: 'Г-образная',
        roomDimensions: lProject.roomDimensions,
        modules: lProject.modules,
        countertopConfig: lProject.countertopConfig,
        plinthConfig: lProject.plinthConfig,
        backsplashConfig: lProject.backsplashConfig
      });
      setSelectedModuleId(lProject.modules[0]?.id || null);
      setSelectedPartId(null);
      setSnapFeedback('✓ Загружена Г-образная кухня с угловым модулем');
      setTimeout(() => setSnapFeedback(null), 3000);
    }
  };

  const filteredTemplates = MODULE_TEMPLATES.filter(
    (t) => t.category === 'Кухня' && t.subCategory === catalogCategory
  );

  // List of interactive parts for currently selected module
  const currentModuleParts = selectedModule
    ? Array.from(partsRegistry.current.values()).filter((p) => p.moduleId === selectedModule.id)
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#181a1f] relative select-none">
      {/* 3D TOP CONTROL TOOLBAR */}
      <div className="h-11 bg-white border-b border-[#e4e6eb] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          {/* Back to 2D Constructor */}
          <button
            onClick={onSwitchToConstructor}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#18181b] hover:bg-[#f4f4f5] rounded-md transition-colors"
          >
            <span>← 2D Конструктор</span>
          </button>

          <div className="h-4 w-px bg-[#e4e6eb] mx-1" />

          {/* Catalog Drawer Toggle */}
          <button
            onClick={() => setShowCatalogDrawer(!showCatalogDrawer)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
              showCatalogDrawer
                ? 'bg-[#18181b] text-white border-[#18181b]'
                : 'bg-white text-[#52525b] border-[#e4e6eb] hover:bg-[#f4f4f5]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[#c26d45]" />
            <span>Каталог в 3D</span>
          </button>

          {/* Move / Drag Mode Toggle */}
          <button
            onClick={() =>
              setInteractionMode(interactionMode === 'move' ? 'orbit' : 'move')
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
              interactionMode === 'move'
                ? 'bg-[#c26d45] text-white border-[#c26d45] shadow-xs'
                : 'bg-white text-[#52525b] border-[#e4e6eb] hover:bg-[#f4f4f5]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{interactionMode === 'move' ? 'Перемещение (ВКЛ)' : 'Переместить шкаф'}</span>
          </button>

          {/* Hierarchy of Parts Toggle */}
          <button
            onClick={() => setShowHierarchyDrawer(!showHierarchyDrawer)}
            disabled={!selectedModule}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all disabled:opacity-40 ${
              showHierarchyDrawer
                ? 'bg-[#18181b] text-white border-[#18181b]'
                : 'bg-white text-[#52525b] border-[#e4e6eb] hover:bg-[#f4f4f5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Двери и ящики шкафа ({currentModuleParts.length})</span>
          </button>

          {/* Quick L-Shaped Preset Demo Button */}
          <button
            onClick={handleLoadLShapedDemo}
            title="Загрузить пример Г-образной планировки с угловым шкафом"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#faf3ee] hover:bg-[#f5e7dc] text-[#c26d45] border border-[#f0ded4] rounded-md transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Пример: Г-образная кухня с углом</span>
          </button>
        </div>

        {/* Right tools: Camera Mode, Angles, Day/Night */}
        <div className="flex items-center gap-2">
          {/* Camera Mode Toggle: Orbit vs Walkthrough */}
          <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded-lg border border-[#e4e6eb]">
            <button
              onClick={() => setCameraMode('orbit')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-all ${
                cameraMode === 'orbit'
                  ? 'bg-white text-[#18181b] shadow-xs'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
              title="Свободное вращение вокруг кухни"
            >
              <Camera className="w-3 h-3 text-[#c26d45]" />
              <span>Орбита</span>
            </button>
            <button
              onClick={() => {
                setCameraMode('walkthrough');
                walkthroughPos.current = {
                  x: project.roomDimensions.width * 0.55,
                  y: 1550,
                  z: project.roomDimensions.depth * 0.88,
                  yaw: 0.82,
                  pitch: -0.12
                };
              }}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-all ${
                cameraMode === 'walkthrough'
                  ? 'bg-white text-[#18181b] shadow-xs'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
              title="Вид из комнаты на уровне глаз (1600 мм)"
            >
              <Eye className="w-3 h-3 text-[#c26d45]" />
              <span>Из комнаты</span>
            </button>
          </div>

          {/* Quick Preset Angles */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold">
            <button
              onClick={() => {
                setCameraMode('orbit');
                cameraSpherical.current = { radius: 3400, theta: 0.85, phi: 1.15 };
              }}
              className="px-1.5 py-1 bg-white hover:bg-[#f4f4f5] text-[#52525b] border border-[#e4e6eb] rounded transition-colors"
              title="Перспектива 3/4"
            >
              3/4
            </button>
            <button
              onClick={() => {
                setCameraMode('orbit');
                cameraSpherical.current = { radius: 3200, theta: 0.0, phi: Math.PI / 2 - 0.05 };
              }}
              className="px-1.5 py-1 bg-white hover:bg-[#f4f4f5] text-[#52525b] border border-[#e4e6eb] rounded transition-colors"
              title="Прямой фронтальный вид"
            >
              Фасад
            </button>
            <button
              onClick={() => {
                setCameraMode('orbit');
                cameraSpherical.current = { radius: 3800, theta: 0.0, phi: 0.18 };
              }}
              className="px-1.5 py-1 bg-white hover:bg-[#f4f4f5] text-[#52525b] border border-[#e4e6eb] rounded transition-colors"
              title="План сверху"
            >
              План
            </button>
          </div>

          <div className="h-4 w-px bg-[#e4e6eb] mx-0.5" />

          {/* Day / Night lighting toggle */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`p-1.5 rounded-md border transition-colors ${
              isNightMode
                ? 'bg-[#18181b] text-amber-400 border-zinc-700'
                : 'bg-white text-[#52525b] border-[#e4e6eb] hover:bg-[#f4f4f5]'
            }`}
            title={isNightMode ? 'Дневной свет' : 'Вечерняя подсветка'}
          >
            {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3D VIEWPORT CONTAINER */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* SLIDE-OUT LEFT MODULE CATALOG DRAWER */}
        {showCatalogDrawer && (
          <aside className="w-76 bg-white/95 backdrop-blur-md border-r border-[#e4e6eb] flex flex-col z-30 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-[#e4e6eb] flex items-center justify-between">
              <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c26d45]" />
                <span>Добавить в 3D</span>
              </div>
              <button
                onClick={() => setShowCatalogDrawer(false)}
                className="p-1 text-[#71717a] hover:text-[#18181b] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 border-b border-[#e4e6eb] grid grid-cols-2 gap-1">
              {(
                ['НИЖНИЕ МОДУЛИ', 'ВЕРХНИЕ МОДУЛИ', 'ПЕНАЛЫ', 'ТЕХНИКА'] as const
              ).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategory(cat)}
                  className={`py-1 px-1.5 text-[10px] font-bold rounded border text-center transition-all ${
                    catalogCategory === cat
                      ? 'bg-[#18181b] text-white border-[#18181b]'
                      : 'bg-white text-[#52525b] border-[#e4e6eb] hover:border-[#b4b7bd]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredTemplates.map((template, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAddModuleIn3D(template)}
                  className="p-2 bg-[#fafafa] hover:bg-[#faf6f3] border border-[#e4e6eb] hover:border-[#c26d45] rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#18181b] truncate group-hover:text-[#c26d45]">
                      {template.name}
                    </div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      {template.width} × {template.height} × {template.depth} мм
                    </div>
                  </div>
                  <button className="p-1 bg-[#18181b] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* THREE.JS CANVAS MOUNT */}
        <div ref={mountRef} className="flex-1 h-full w-full cursor-grab active:cursor-grabbing" />

        {/* COLLISION WARNING NOTIFICATION BANNER */}
        {collisionWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full border border-red-400 shadow-2xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{collisionWarning}</span>
          </div>
        )}

        {/* SMART SNAP NOTIFICATION BADGE */}
        {snapFeedback && !collisionWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#18181b]/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full border border-zinc-700 shadow-xl flex items-center gap-2 pointer-events-none animate-in fade-in zoom-in-95 duration-150 z-40">
            <Magnet className="w-4 h-4 text-[#c26d45]" />
            <span>{snapFeedback}</span>
          </div>
        )}

        {/* HOVERED PART HINT TOOLTIP */}
        {hoveredPartId && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full pointer-events-none border border-white/20 z-20">
            Кликните, чтобы {partsRegistry.current.get(hoveredPartId)?.isOpen ? 'закрыть' : 'открыть'}:{' '}
            <strong className="text-amber-300">{partsRegistry.current.get(hoveredPartId)?.name}</strong>
          </div>
        )}

        {/* ROOM CORNER & DIMENSIONS INFO BADGE */}
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-xs border border-[#cbd5e1] rounded-lg px-3 py-1.5 shadow-md flex items-center gap-3 text-xs pointer-events-none">
          <div className="font-bold text-[#18181b]">
            <span className="text-[#64748b] text-[11px] font-normal">Комната: </span>
            <span className="font-mono text-xs">{project.roomDimensions.width} × {project.roomDimensions.depth} мм</span>
          </div>
          <div className="h-3 w-px bg-[#cbd5e1]" />
          <div className="text-[11px] text-[#52525b]">
            Стена A (Задняя) + Стена B (Левая Г-крыло)
          </div>
        </div>

        {/* RIGHT DRAWER: INDIVIDUAL DOORS & DRAWERS HIERARCHY TREE */}
        {showHierarchyDrawer && selectedModule && (
          <aside className="absolute right-4 top-16 bottom-36 w-80 bg-white/95 backdrop-blur-md border border-[#e4e6eb] rounded-2xl shadow-2xl p-4 flex flex-col z-40 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#c26d45]" />
                <span className="font-bold text-xs text-[#18181b]">Иерархия элементов модуля</span>
              </div>
              <button
                onClick={() => setShowHierarchyDrawer(false)}
                className="p-1 text-[#71717a] hover:text-[#18181b] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] font-semibold text-[#18181b] mb-2 flex items-center gap-1.5">
              <span>{selectedModule.name}</span>
              <span className="text-[#71717a] font-normal">({selectedModule.width}×{selectedModule.height} мм)</span>
            </div>

            {/* Tree items */}
            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {currentModuleParts.length === 0 ? (
                <div className="text-center py-6 text-[#71717a] text-xs">
                  У этого модуля нет подвижных дверей или ящиков.
                </div>
              ) : (
                currentModuleParts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => setSelectedPartId(part.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedPartId === part.id
                        ? 'border-[#c26d45] bg-[#faf3ee]'
                        : 'border-[#e4e6eb] bg-[#fafafa] hover:border-[#cbd5e1]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#18181b] text-xs flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-[#c26d45]" />
                        <span className="truncate">{part.name}</span>
                      </div>
                      <div className="text-[10px] text-[#71717a] mt-0.5 ml-4">
                        {part.openingType} · {part.type === 'drawer' ? `${part.maxSlide} мм` : `${part.maxAngle}°`}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIndividualPart(part.id);
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                        part.isOpen
                          ? 'bg-[#c26d45] text-white border-[#c26d45]'
                          : 'bg-white text-[#52525b] border-[#cbd5e1] hover:bg-[#f4f4f5]'
                      }`}
                    >
                      {part.isOpen ? <DoorOpen className="w-3 h-3" /> : <DoorClosed className="w-3 h-3" />}
                      <span>{part.isOpen ? 'Открыт' : 'Закрыт'}</span>
                    </button>
                  </div>
                ))
              )}

              {/* Internal Shelves and Handle display in hierarchy */}
              {selectedModule.shelvesCount > 0 && (
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-[#71717a] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 ml-2" />
                  <span>Полки внутренние: {selectedModule.shelvesCount} шт. (ЛДСП 18 мм)</span>
                </div>
              )}

              {selectedModule.handleType && (
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-[#71717a] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 ml-2" />
                  <span>Ручка: {selectedModule.handleType}</span>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* SELECTED INDIVIDUAL PART SETTINGS FLOATING CARD */}
        {selectedPart && (
          <div className="absolute top-16 right-4 w-76 bg-white/95 backdrop-blur-md border border-[#e4e6eb] rounded-2xl shadow-2xl p-4 z-40 text-[#18181b] animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2 mb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-[#c26d45] flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>Настройка открывания</span>
              </span>
              <button
                onClick={() => setSelectedPartId(null)}
                className="p-1 text-[#71717a] hover:text-[#18181b] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-bold text-xs text-[#18181b]">{selectedPart.name}</div>

              {/* Opening Type */}
              <div>
                <label className="block text-[10px] text-[#71717a] mb-1">Тип открывания</label>
                <select
                  value={selectedPart.openingType}
                  onChange={(e) =>
                    handleUpdatePartSettings({ openingType: e.target.value as OpeningType })
                  }
                  className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                >
                  <option value="распашной">Распашной (на петлях)</option>
                  <option value="подъемный">Подъемный (Aventos)</option>
                  <option value="откидной">Откидной (вниз)</option>
                  <option value="выдвижной">Выдвижной ящик</option>
                  <option value="раздвижной">Раздвижная дверь</option>
                </select>
              </div>

              {/* Hinge Side (for doors) */}
              {selectedPart.type === 'door' && (
                <div>
                  <label className="block text-[10px] text-[#71717a] mb-1">Сторона петель</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['left', 'right', 'top', 'bottom'] as const).map((side) => (
                      <button
                        key={side}
                        onClick={() => handleUpdatePartSettings({ hingeSide: side })}
                        className={`py-1 text-[10px] font-semibold rounded border text-center ${
                          selectedPart.hingeSide === side
                            ? 'bg-[#18181b] text-white border-[#18181b]'
                            : 'bg-white text-[#52525b] border-[#e4e6eb]'
                        }`}
                      >
                        {side === 'left' ? 'Слева' : side === 'right' ? 'Справа' : side === 'top' ? 'Сверху' : 'Снизу'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Opening angle (for swing / lift doors) */}
              {selectedPart.type === 'door' && (
                <div>
                  <label className="block text-[10px] text-[#71717a] mb-1">Угол открывания</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[95, 110, 120, 170].map((ang) => (
                      <button
                        key={ang}
                        onClick={() => handleUpdatePartSettings({ maxAngle: ang })}
                        className={`py-1 text-[10px] font-semibold rounded border text-center ${
                          selectedPart.maxAngle === ang
                            ? 'bg-[#c26d45] text-white border-[#c26d45]'
                            : 'bg-white text-[#52525b] border-[#e4e6eb]'
                        }`}
                      >
                        {ang}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drawer slide depth & runners */}
              {selectedPart.type === 'drawer' && (
                <>
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">Глубина выдвижения</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[350, 450, 500].map((sl) => (
                        <button
                          key={sl}
                          onClick={() => handleUpdatePartSettings({ maxSlide: sl })}
                          className={`py-1 text-[10px] font-semibold rounded border text-center ${
                            selectedPart.maxSlide === sl
                              ? 'bg-[#c26d45] text-white border-[#c26d45]'
                              : 'bg-white text-[#52525b] border-[#e4e6eb]'
                          }`}
                        >
                          {sl} мм
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">Тип направляющих</label>
                    <select
                      value={selectedPart.runnerType || 'Blum Legrabox'}
                      onChange={(e) => handleUpdatePartSettings({ runnerType: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Blum Legrabox">Blum Legrabox Pure (доводчик)</option>
                      <option value="Boyard B-Box">Boyard B-Box скрытый монтаж</option>
                      <option value="Шариковые">Шариковые полновыкатные 45мм</option>
                    </select>
                  </div>
                </>
              )}

              {/* Toggle Open/Close Button */}
              <button
                onClick={() => toggleIndividualPart(selectedPart.id)}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  selectedPart.isOpen
                    ? 'bg-[#c26d45] hover:bg-[#b05d37] text-white'
                    : 'bg-[#18181b] hover:bg-[#27272a] text-white'
                }`}
              >
                {selectedPart.isOpen ? <DoorClosed className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
                <span>{selectedPart.isOpen ? 'Закрыть этот фасад' : 'Открыть этот фасад'}</span>
              </button>
            </div>
          </div>
        )}

        {/* FLOATING 3D TRANSFORM HUD & QUICK ACTIONS BAR */}
        {selectedModule && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-[#e4e6eb] rounded-2xl shadow-2xl p-3 px-5 flex flex-col gap-2.5 max-w-4xl text-[#18181b] animate-in slide-in-from-bottom-2 duration-150">
            {/* Top row: Module Name, Rotation badge, and Close */}
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#faf3ee] text-[#c26d45] px-2 py-0.5 rounded border border-[#f0ded4]">
                  №{selectedModuleIndex + 1}
                </span>
                <span className="font-bold text-xs truncate max-w-xs">{selectedModule.name}</span>
                <span className="text-[11px] text-[#71717a] font-mono">
                  ({selectedModule.width}×{selectedModule.height}×{selectedModule.depth} мм)
                </span>
                <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">
                  Угол: {selectedModule.rotation || 0}°
                </span>
                {selectedPart && (
                  <span className="text-[10px] font-bold bg-[#faf3ee] text-[#c26d45] border border-[#f0ded4] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>Деталь:</span>
                    <span className="underline">{selectedPart.name}</span>
                    <span className="text-[9px] text-[#71717a]">({selectedPart.isOpen ? 'Открыта' : 'Закрыта'})</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDuplicate}
                  title="Дублировать модуль"
                  className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  title="Удалить модуль"
                  className="p-1 text-[#71717a] hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="h-3.5 w-px bg-[#e4e6eb] mx-0.5" />
                <button
                  onClick={() => {
                    setSelectedModuleId(null);
                    setSelectedPartId(null);
                  }}
                  title="Закрыть панель (снять выбор)"
                  className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Center row: 3D Gizmo Axis Controls (X, Y, Z, Rotation) */}
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-1.5 rounded-lg flex items-center justify-between">
                <span className="text-[#ef4444] font-bold text-[11px]">X (Стена):</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStepCoord('x', -50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-bold text-[#1e293b]">
                    {selectedModule.x} мм
                  </span>
                  <button
                    onClick={() => handleStepCoord('x', 50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-1.5 rounded-lg flex items-center justify-between">
                <span className="text-[#10b981] font-bold text-[11px]">Y (Высота):</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStepCoord('y', -50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-bold text-[#1e293b]">
                    {selectedModule.y} мм
                  </span>
                  <button
                    onClick={() => handleStepCoord('y', 50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-1.5 rounded-lg flex items-center justify-between">
                <span className="text-[#3b82f6] font-bold text-[11px]">Z (Глубина):</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStepCoord('z', -50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-bold text-[#1e293b]">
                    {selectedModule.z} мм
                  </span>
                  <button
                    onClick={() => handleStepCoord('z', 50)}
                    className="w-5 h-5 bg-white border border-[#cbd5e1] rounded hover:bg-[#f1f5f9] flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleRotate90}
                className="bg-[#faf3ee] hover:bg-[#f5e7dc] text-[#c26d45] border border-[#f0ded4] px-2 py-1 rounded-lg flex items-center justify-center gap-1.5 font-sans font-bold text-xs transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Повернуть на 90°</span>
              </button>
            </div>

            {/* Bottom row: Quick Action Alignment Buttons */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
              <button
                onClick={handleSnapToWall}
                className="px-2.5 py-1 bg-[#18181b] hover:bg-[#27272a] text-white text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
              >
                <Magnet className="w-3 h-3 text-[#c26d45]" />
                <span>Привязать к стене</span>
              </button>

              <button
                onClick={handlePlaceInCorner}
                className="px-2.5 py-1 bg-white hover:bg-[#f4f4f5] text-[#18181b] border border-[#cbd5e1] text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <CornerDownRight className="w-3 h-3 text-[#c26d45]" />
                <span>В угол (90°)</span>
              </button>

              <button
                onClick={handleAlignWithAdjacent}
                className="px-2.5 py-1 bg-white hover:bg-[#f4f4f5] text-[#18181b] border border-[#cbd5e1] text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Sliders className="w-3 h-3 text-[#3b82f6]" />
                <span>Выровнять со смежным</span>
              </button>

              <button
                onClick={() => setShowHierarchyDrawer(!showHierarchyDrawer)}
                className="px-2.5 py-1 bg-[#faf3ee] hover:bg-[#f5e7dc] text-[#c26d45] border border-[#f0ded4] text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <DoorOpen className="w-3 h-3" />
                <span>Открыть двери/ящики ({currentModuleParts.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* SUBTLE HINT BAR WHEN NOTHING IS SELECTED */}
        {!selectedModule && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md border border-[#e4e6eb] rounded-full shadow-lg px-4 py-2 flex items-center gap-2.5 text-xs text-[#52525b] pointer-events-none animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-[#c26d45] animate-pulse" />
            <span className="font-medium text-[#18181b]">Нажмите на любой модуль или деталь в 3D</span>
            <span className="text-[#d4d4d8]">|</span>
            <span className="text-[#71717a]">Клик по фасаду или ящику открывает его и параметры</span>
          </div>
        )}
      </div>
    </div>
  );
};
