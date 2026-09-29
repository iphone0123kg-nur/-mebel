import React, { useState, useRef, useEffect } from 'react';
import {
  FurnitureModule,
  Project,
  CountertopConfig,
  PlinthConfig,
  BacksplashConfig,
  SmartWarning
} from '../types/furniture';
import { MODULE_TEMPLATES, ModuleTemplate } from '../data/initialData';
import { checkKitchenWarnings } from '../utils/warnings';
import {
  MousePointer,
  Move,
  Ruler,
  Copy,
  Undo2,
  Redo2,
  Box,
  Save,
  Trash2,
  Lock,
  Unlock,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  Sliders,
  Check
} from 'lucide-react';

interface ConstructorWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateTo3D: () => void;
}

export const ConstructorWorkspace: React.FC<ConstructorWorkspaceProps> = ({
  project,
  onUpdateProject,
  onNavigateTo3D
}) => {
  // Selection & Tools
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    project.modules[0]?.id || null
  );
  const [activeTool, setActiveTool] = useState<'select' | 'move'>('select');
  const [showDimensions, setShowDimensions] = useState(true);
  const [viewMode, setViewMode] = useState<'2D_front' | '2D_top'>('2D_front');
  const [zoom, setZoom] = useState(0.24); // scale factor: mm to pixels
  const [history, setHistory] = useState<FurnitureModule[][]>([project.modules]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [saveToast, setSaveToast] = useState(false);

  // Snapping guides
  const [activeSnapGuideX, setActiveSnapGuideX] = useState<number | null>(null);
  const [activeSnapGuideY, setActiveSnapGuideY] = useState<number | null>(null);
  const [snapGuideLabel, setSnapGuideLabel] = useState<string | null>(null);

  // Left sidebar category tab
  const [libraryCategory, setLibraryCategory] = useState<
    'НИЖНИЕ МОДУЛИ' | 'ВЕРХНИЕ МОДУЛИ' | 'ПЕНАЛЫ' | 'ТЕХНИКА' | 'ШКАФ'
  >('НИЖНИЕ МОДУЛИ');

  // Popover menus for Countertop, Plinth, Backsplash
  const [activeSettingsPopover, setActiveSettingsPopover] = useState<
    'countertop' | 'plinth' | 'backsplash' | 'warnings' | null
  >(null);

  // Dragging state on canvas
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{
    mouseX: number;
    mouseY: number;
    modX: number;
    modY: number;
  } | null>(null);

  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const [isLibraryItemDragging, setIsLibraryItemDragging] = useState(false);
  const [dragOverCanvasX, setDragOverCanvasX] = useState<number | null>(null);

  const currentModule = project.modules.find((m) => m.id === selectedModuleId);
  const currentModuleIndex = project.modules.findIndex((m) => m.id === selectedModuleId);

  // Configurations with sensible defaults
  const countertopConfig: CountertopConfig = project.countertopConfig || {
    enabled: project.hasCountertop ?? true,
    thickness: 38,
    depth: 600,
    material: 'ДСП влагостойкая HPL Slotex',
    color: 'Графит матовый',
    colorHex: '#27272a',
    edgeProfile: 'Прямой с фаской'
  };

  const plinthConfig: PlinthConfig = project.plinthConfig || {
    enabled: project.hasPlinth ?? true,
    height: 100,
    material: 'Пластик с силиконовым уплотнителем',
    color: 'Черный матовый',
    colorHex: '#18181b'
  };

  const backsplashConfig: BacksplashConfig = project.backsplashConfig || {
    enabled: true,
    type: 'плитка',
    materialName: 'Керамогранит крупноформатный',
    colorHex: '#e5e7eb',
    height: 600
  };

  // Run smart warnings check in real-time
  const warnings: SmartWarning[] = checkKitchenWarnings(
    project.modules,
    project.roomDimensions
  );

  // Sync history when external project changes if needed
  const updateModules = (newModules: FurnitureModule[], recordHistory = true) => {
    onUpdateProject({
      ...project,
      modules: newModules
    });

    if (recordHistory) {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(newModules);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateProject({ ...project, modules: prev });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateProject({ ...project, modules: next });
    }
  };

  // Add module from library
  const handleAddModule = (template: ModuleTemplate) => {
    const isUpper =
      template.subCategory === 'ВЕРХНИЕ МОДУЛИ' ||
      template.type.includes('wall') ||
      template.applianceType === 'hood';
    const isTall =
      template.subCategory === 'ПЕНАЛЫ' || template.type.includes('tall');

    // Default Y positioning
    const plinthH = plinthConfig.enabled ? plinthConfig.height : 0;
    const baseH = 720;
    const ctH = countertopConfig.enabled ? countertopConfig.thickness : 0;
    const bsH = backsplashConfig.enabled ? backsplashConfig.height : 600;

    let defaultY = plinthH;
    if (isUpper) {
      defaultY = plinthH + baseH + ctH + bsH; // e.g. 100 + 720 + 38 + 600 = 1458 mm
    }

    // Find next available X coordinate
    const existingSameLevel = project.modules.filter((m) =>
      isUpper ? m.y > 1000 : m.y < 500
    );
    let nextX = 0;
    if (existingSameLevel.length > 0) {
      const rightmost = existingSameLevel.reduce(
        (max, m) => Math.max(max, m.x + m.width),
        0
      );
      nextX =
        rightmost + template.width <= project.roomDimensions.width
          ? rightmost
          : 0;
    }

    const newMod: FurnitureModule = {
      id: 'mod-' + Date.now(),
      name: template.name,
      category: template.subCategory as any,
      type: template.type,
      x: nextX,
      y: defaultY,
      z: 0,
      width: template.width,
      height: template.height,
      depth: template.depth,
      shelvesCount: template.shelvesCount,
      facadesCount: template.facadesCount,
      drawersCount: template.drawersCount,
      carcassMaterial: 'ЛДСП 18 мм',
      carcassThickness: 18,
      facadeMaterial: 'МДФ 19 мм',
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
  };

  // Drag and Drop from left catalog onto wall canvas
  const handleDropFromLibrary = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLibraryItemDragging(false);
    setDragOverCanvasX(null);
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const template: ModuleTemplate = JSON.parse(data);
      if (!wallRef.current) return;
      const rect = wallRef.current.getBoundingClientRect();
      const rawMouseX = (e.clientX - rect.left) / zoom;

      const isUpper =
        template.subCategory === 'ВЕРХНИЕ МОДУЛИ' ||
        template.type.includes('wall') ||
        template.applianceType === 'hood';

      const plinthH = plinthConfig.enabled ? plinthConfig.height : 0;
      const baseH = 720;
      const ctH = countertopConfig.enabled ? countertopConfig.thickness : 0;
      const bsH = backsplashConfig.enabled ? backsplashConfig.height : 600;
      const upperLineY = plinthH + baseH + ctH + bsH;

      const targetY = isUpper ? upperLineY : plinthH;
      let targetX = Math.round(rawMouseX - template.width / 2);

      // Snap to adjacent cabinets
      const snapThreshold = 45;
      project.modules.forEach((other) => {
        if (Math.abs(targetX - (other.x + other.width)) < snapThreshold) {
          targetX = other.x + other.width;
        } else if (Math.abs(targetX + template.width - other.x) < snapThreshold) {
          targetX = other.x - template.width;
        }
      });

      // Snap to left or right wall
      if (Math.abs(targetX) < snapThreshold) targetX = 0;
      if (Math.abs(targetX + template.width - project.roomDimensions.width) < snapThreshold) {
        targetX = project.roomDimensions.width - template.width;
      }

      // Clamp inside room
      targetX = Math.max(0, Math.min(project.roomDimensions.width - template.width, targetX));

      const newMod: FurnitureModule = {
        id: 'mod-' + Date.now(),
        name: template.name,
        category: template.subCategory as any,
        type: template.type,
        x: targetX,
        y: targetY,
        z: 0,
        width: template.width,
        height: template.height,
        depth: template.depth,
        shelvesCount: template.shelvesCount,
        facadesCount: template.facadesCount,
        drawersCount: template.drawersCount,
        carcassMaterial: 'ЛДСП 18 мм',
        carcassThickness: 18,
        facadeMaterial: 'МДФ 19 мм',
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
    } catch (err) {
      console.error('Failed to parse dropped template', err);
    }
  };

  // Duplicate selected module
  const handleDuplicate = () => {
    if (!currentModule) return;
    const duplicated: FurnitureModule = {
      ...currentModule,
      id: 'mod-' + Date.now(),
      name: `${currentModule.name} (Копия)`,
      x: Math.min(
        project.roomDimensions.width - currentModule.width,
        currentModule.x + currentModule.width
      )
    };
    updateModules([...project.modules, duplicated]);
    setSelectedModuleId(duplicated.id);
  };

  // Delete selected module
  const handleDelete = () => {
    if (!currentModule) return;
    const updated = project.modules.filter((m) => m.id !== currentModule.id);
    updateModules(updated);
    setSelectedModuleId(updated[0]?.id || null);
  };

  // Toggle lock
  const handleToggleLock = () => {
    if (!currentModule) return;
    const updated = project.modules.map((m) =>
      m.id === currentModule.id ? { ...m, isLocked: !m.isLocked } : m
    );
    updateModules(updated);
  };

  // Update specific module field
  const handleUpdateCurrentModule = (fields: Partial<FurnitureModule>) => {
    if (!currentModule) return;
    const updated = project.modules.map((m) =>
      m.id === currentModule.id ? { ...m, ...fields } : m
    );
    updateModules(updated);
  };

  // Drag handling with AUTOMATIC MAGNETIC SNAPPING
  const handleMouseDownModule = (e: React.MouseEvent, mod: FurnitureModule) => {
    e.stopPropagation();
    setSelectedModuleId(mod.id);
    if (mod.isLocked) return;

    setDraggingModuleId(mod.id);
    setDragStartPos({
      mouseX: e.clientX,
      mouseY: e.clientY,
      modX: mod.x,
      modY: mod.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingModuleId || !dragStartPos) return;

      const deltaX = (e.clientX - dragStartPos.mouseX) / zoom;
      const deltaY = (dragStartPos.mouseY - e.clientY) / zoom; // invert Y since floor is at bottom

      let targetX = Math.round(dragStartPos.modX + deltaX);
      let targetY = Math.round(dragStartPos.modY + deltaY);

      const movingMod = project.modules.find((m) => m.id === draggingModuleId);
      if (!movingMod) return;

      const snapThreshold = 35; // 35mm magnetic snap radius
      let snappedX = targetX;
      let snapGuideX: number | null = null;
      let snapLabel: string | null = null;

      // 1. Snap to Left Wall (X = 0)
      if (Math.abs(targetX) < snapThreshold) {
        snappedX = 0;
        snapGuideX = 0;
        snapLabel = 'Левая стена (0 мм)';
      }
      // 2. Snap to Right Wall (X = roomWidth - modWidth)
      else if (
        Math.abs(targetX + movingMod.width - project.roomDimensions.width) <
        snapThreshold
      ) {
        snappedX = project.roomDimensions.width - movingMod.width;
        snapGuideX = project.roomDimensions.width;
        snapLabel = `Правая стена (${project.roomDimensions.width} мм)`;
      }

      // 3. Snap to Adjacent Cabinets (Horizontal)
      project.modules.forEach((other) => {
        if (other.id === movingMod.id) return;

        // Snapping movingMod's left edge to other's right edge
        if (Math.abs(targetX - (other.x + other.width)) < snapThreshold) {
          snappedX = other.x + other.width;
          snapGuideX = snappedX;
          snapLabel = `Стык с ${other.name} (${snappedX} мм)`;
        }
        // Snapping movingMod's right edge to other's left edge
        else if (
          Math.abs(targetX + movingMod.width - other.x) < snapThreshold
        ) {
          snappedX = other.x - movingMod.width;
          snapGuideX = other.x;
          snapLabel = `Стык с ${other.name} (${other.x} мм)`;
        }
      });

      // Clamp X inside room
      snappedX = Math.max(
        0,
        Math.min(project.roomDimensions.width - movingMod.width, snappedX)
      );

      // 4. Vertical Snapping (Floor, Countertop Line, Upper Line)
      let snappedY = targetY;
      let snapGuideY: number | null = null;

      const plinthH = plinthConfig.enabled ? plinthConfig.height : 0;
      const baseH = 720;
      const ctH = countertopConfig.enabled ? countertopConfig.thickness : 0;
      const bsH = backsplashConfig.enabled ? backsplashConfig.height : 600;
      const upperLineY = plinthH + baseH + ctH + bsH; // e.g. 1458 mm

      // Snap to Floor / Plinth
      if (Math.abs(targetY - plinthH) < snapThreshold) {
        snappedY = plinthH;
        snapGuideY = plinthH;
        if (!snapLabel) snapLabel = `Линия цоколя (${plinthH} мм)`;
      }
      // Snap to Upper Line (Top of backsplash / bottom of upper cabinets)
      else if (Math.abs(targetY - upperLineY) < snapThreshold) {
        snappedY = upperLineY;
        snapGuideY = upperLineY;
        if (!snapLabel) snapLabel = `Линия фартука (${upperLineY} мм)`;
      }
      // Snap to flush floor (Y = 0)
      else if (Math.abs(targetY) < snapThreshold) {
        snappedY = 0;
        snapGuideY = 0;
      }

      // Snap Y to adjacent module's Y level
      project.modules.forEach((other) => {
        if (other.id === movingMod.id) return;
        if (Math.abs(targetY - other.y) < snapThreshold) {
          snappedY = other.y;
          snapGuideY = other.y;
          if (!snapLabel) snapLabel = `По уровню с ${other.name}`;
        }
      });

      // Clamp Y inside room
      snappedY = Math.max(
        0,
        Math.min(project.roomDimensions.height - movingMod.height, snappedY)
      );

      setActiveSnapGuideX(snapGuideX);
      setActiveSnapGuideY(snapGuideY);
      setSnapGuideLabel(snapLabel);

      const updated = project.modules.map((m) =>
        m.id === draggingModuleId ? { ...m, x: snappedX, y: snappedY } : m
      );
      onUpdateProject({ ...project, modules: updated });
    };

    const handleMouseUp = () => {
      if (draggingModuleId) {
        setDraggingModuleId(null);
        setDragStartPos(null);
        setActiveSnapGuideX(null);
        setActiveSnapGuideY(null);
        setSnapGuideLabel(null);
        updateModules(project.modules, true);
      }
    };

    if (draggingModuleId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    draggingModuleId,
    dragStartPos,
    zoom,
    project,
    plinthConfig,
    countertopConfig,
    backsplashConfig
  ]);

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Base modules and countertop boundaries
  const baseModules = project.modules.filter(
    (m) =>
      m.y <= 200 &&
      (m.category === 'НИЖНИЕ МОДУЛИ' ||
        m.type.includes('base') ||
        m.type.includes('appliance_dishwasher') ||
        m.type.includes('appliance_oven'))
  );

  const hasBaseCabinets = baseModules.length > 0;
  const minBaseX = hasBaseCabinets
    ? Math.min(...baseModules.map((m) => m.x))
    : 0;
  const maxBaseX = hasBaseCabinets
    ? Math.max(...baseModules.map((m) => m.x + m.width))
    : 0;
  const totalBaseWidth = maxBaseX - minBaseX;

  // Cutouts on countertop:
  // Find modules with cutoutType === 'sink' or 'cooktop'
  const sinkModules = project.modules.filter(
    (m) => m.cutoutType === 'sink' || m.applianceType === 'sink'
  );
  const cooktopModules = project.modules.filter(
    (m) =>
      m.cutoutType === 'cooktop' ||
      m.applianceType === 'cooktop' ||
      m.type.includes('oven')
  );

  // Filter templates for left catalog
  const filteredTemplates = MODULE_TEMPLATES.filter((t) => {
    if (libraryCategory === 'ШКАФ') {
      return t.category === 'Шкаф';
    }
    return t.category === 'Кухня' && t.subCategory === libraryCategory;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f5f7]">
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="absolute top-16 right-8 z-50 bg-[#18181b] text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <Sparkles className="w-4 h-4 text-[#c26d45]" />
          <span>Проект кухни успешно сохранен в базе данных</span>
        </div>
      )}

      {/* TOP TOOLBAR */}
      <div className="h-11 bg-white border-b border-[#e4e6eb] px-4 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-1.5">
          {/* Tool: Select */}
          <button
            onClick={() => setActiveTool('select')}
            title="Инструмент Выбрать"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded ${
              activeTool === 'select'
                ? 'bg-[#18181b] text-white'
                : 'text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Выбрать</span>
          </button>

          {/* Tool: Move */}
          <button
            onClick={() => setActiveTool('move')}
            title="Инструмент Переместить"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded ${
              activeTool === 'move'
                ? 'bg-[#18181b] text-white'
                : 'text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Переместить</span>
          </button>

          <div className="h-4 w-px bg-[#e4e6eb] mx-1" />

          {/* Dimensions Toggle */}
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            title="Отображение размеров"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded ${
              showDimensions
                ? 'bg-[#faf3ee] text-[#c26d45]'
                : 'text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Размеры</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            disabled={!currentModule}
            title="Копировать модуль"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-40 rounded"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Копировать</span>
          </button>

          <div className="h-4 w-px bg-[#e4e6eb] mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Отменить (Ctrl+Z)"
            className="p-1.5 text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-30 rounded"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Повторить (Ctrl+Y)"
            className="p-1.5 text-[#52525b] hover:bg-[#f4f4f5] disabled:opacity-30 rounded"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e4e6eb] mx-1" />

          {/* 2D / 3D Switch */}
          <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded">
            <button
              onClick={() => setViewMode('2D_front')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                viewMode === '2D_front'
                  ? 'bg-white shadow-xs text-[#18181b]'
                  : 'text-[#71717a]'
              }`}
            >
              2D Фасад
            </button>
            <button
              onClick={() => setViewMode('2D_top')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                viewMode === '2D_top'
                  ? 'bg-white shadow-xs text-[#18181b]'
                  : 'text-[#71717a]'
              }`}
            >
              2D Сверху
            </button>
          </div>

          <button
            onClick={onNavigateTo3D}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded"
          >
            <Box className="w-3.5 h-3.5 text-[#c26d45]" />
            <span>3D Вид</span>
          </button>
        </div>

        {/* Right side of toolbar: Kitchen System Controls */}
        <div className="flex items-center gap-2">
          {/* Smart Warnings Badge */}
          {warnings.length > 0 && (
            <button
              onClick={() =>
                setActiveSettingsPopover(
                  activeSettingsPopover === 'warnings' ? null : 'warnings'
                )
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                warnings.some((w) => w.type === 'error')
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warnings.length} пред.</span>
            </button>
          )}

          {/* 4. Countertop Toggle & Settings Popover */}
          <div className="relative">
            <button
              onClick={() =>
                setActiveSettingsPopover(
                  activeSettingsPopover === 'countertop' ? null : 'countertop'
                )
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                countertopConfig.enabled
                  ? 'bg-[#18181b] text-white border-[#18181b]'
                  : 'bg-white text-[#71717a] border-[#e4e6eb] hover:bg-[#f4f4f5]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Столешница</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {activeSettingsPopover === 'countertop' && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#e4e6eb] p-4 z-50 text-[#18181b] animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2 mb-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#c26d45]">
                    Параметры столешницы
                  </span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={countertopConfig.enabled}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          hasCountertop: e.target.checked,
                          countertopConfig: {
                            ...countertopConfig,
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="rounded accent-[#18181b]"
                    />
                    <span>Вкл</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Толщина плиты
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[12, 20, 38, 60].map((th) => (
                        <button
                          key={th}
                          onClick={() =>
                            onUpdateProject({
                              ...project,
                              countertopConfig: {
                                ...countertopConfig,
                                thickness: th
                              }
                            })
                          }
                          className={`py-1 text-xs font-semibold rounded border text-center ${
                            countertopConfig.thickness === th
                              ? 'bg-[#18181b] text-white border-[#18181b]'
                              : 'bg-white text-[#52525b] border-[#e4e6eb]'
                          }`}
                        >
                          {th} мм
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Глубина свеса
                    </label>
                    <select
                      value={countertopConfig.depth}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          countertopConfig: {
                            ...countertopConfig,
                            depth: Number(e.target.value)
                          }
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value={600}>600 мм (стандартный свес)</option>
                      <option value={650}>650 мм (увеличенный свес)</option>
                      <option value={800}>800 мм (для острова)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Материал
                    </label>
                    <select
                      value={countertopConfig.material}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          countertopConfig: {
                            ...countertopConfig,
                            material: e.target.value
                          }
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="ДСП влагостойкая HPL Slotex">
                        ДСП влагостойкая HPL (Slotex)
                      </option>
                      <option value="Компакт-плита 12 мм">
                        Компакт-плита HPL Fundermax
                      </option>
                      <option value="Кварцевый агломерат">
                        Кварцевый агломерат Caesarstone
                      </option>
                      <option value="Искусственный акриловый камень">
                        Искусственный камень Grandex
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Декор / Цвет
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Графит матовый', hex: '#27272a' },
                        { name: 'Белый мрамор Калакатта', hex: '#f0f0ed' },
                        { name: 'Дуб Вотан', hex: '#bc8f58' },
                        { name: 'Бетон серый', hex: '#94a3b8' },
                        { name: 'Черный монолит', hex: '#111827' }
                      ].map((col) => (
                        <button
                          key={col.hex}
                          onClick={() =>
                            onUpdateProject({
                              ...project,
                              countertopConfig: {
                                ...countertopConfig,
                                color: col.name,
                                colorHex: col.hex
                              }
                            })
                          }
                          title={col.name}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            countertopConfig.colorHex === col.hex
                              ? 'ring-2 ring-[#c26d45] scale-110'
                              : 'border-[#d4d4d8]'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Профиль кромки
                    </label>
                    <select
                      value={countertopConfig.edgeProfile}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          countertopConfig: {
                            ...countertopConfig,
                            edgeProfile: e.target.value
                          }
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Прямой с фаской">Прямой с еврофаской</option>
                      <option value="Радиусный R3">Радиусный R3</option>
                      <option value="Постформинг">Постформинг</option>
                      <option value="Еврозапил">Еврозапил со скосом</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Plinth / Цоколь Popover */}
          <div className="relative">
            <button
              onClick={() =>
                setActiveSettingsPopover(
                  activeSettingsPopover === 'plinth' ? null : 'plinth'
                )
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                plinthConfig.enabled
                  ? 'bg-[#18181b] text-white border-[#18181b]'
                  : 'bg-white text-[#71717a] border-[#e4e6eb] hover:bg-[#f4f4f5]'
              }`}
            >
              <span>Цоколь</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {activeSettingsPopover === 'plinth' && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#e4e6eb] p-4 z-50 text-[#18181b] animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2 mb-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#c26d45]">
                    Настройка цоколя
                  </span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={plinthConfig.enabled}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          hasPlinth: e.target.checked,
                          plinthConfig: {
                            ...plinthConfig,
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="rounded accent-[#18181b]"
                    />
                    <span>Вкл</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Высота цоколя
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[100, 120, 150].map((h) => (
                        <button
                          key={h}
                          onClick={() =>
                            onUpdateProject({
                              ...project,
                              plinthConfig: { ...plinthConfig, height: h }
                            })
                          }
                          className={`py-1 text-xs font-semibold rounded border text-center ${
                            plinthConfig.height === h
                              ? 'bg-[#18181b] text-white border-[#18181b]'
                              : 'bg-white text-[#52525b] border-[#e4e6eb]'
                          }`}
                        >
                          {h} мм
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Материал
                    </label>
                    <select
                      value={plinthConfig.material}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          plinthConfig: {
                            ...plinthConfig,
                            material: e.target.value
                          }
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Пластик с силиконовым уплотнителем">
                        Пластик с водоотталкивающим уплотнителем
                      </option>
                      <option value="МДФ в цвет фасада">МДФ в цвет фасада</option>
                      <option value="Алюминиевый профиль">
                        Алюминиевый цельный профиль
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Цвет
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Черный матовый', hex: '#18181b' },
                        { name: 'Белый матовый', hex: '#fcfcfc' },
                        { name: 'Алюминий', hex: '#94a3b8' },
                        { name: 'Кашемир', hex: '#d8cebf' }
                      ].map((col) => (
                        <button
                          key={col.hex}
                          onClick={() =>
                            onUpdateProject({
                              ...project,
                              plinthConfig: {
                                ...plinthConfig,
                                color: col.name,
                                colorHex: col.hex
                              }
                            })
                          }
                          title={col.name}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            plinthConfig.colorHex === col.hex
                              ? 'ring-2 ring-[#c26d45] scale-110'
                              : 'border-[#d4d4d8]'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Backsplash / Фартук Popover */}
          <div className="relative">
            <button
              onClick={() =>
                setActiveSettingsPopover(
                  activeSettingsPopover === 'backsplash' ? null : 'backsplash'
                )
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                backsplashConfig.enabled
                  ? 'bg-[#18181b] text-white border-[#18181b]'
                  : 'bg-white text-[#71717a] border-[#e4e6eb] hover:bg-[#f4f4f5]'
              }`}
            >
              <span>Фартук</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {activeSettingsPopover === 'backsplash' && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#e4e6eb] p-4 z-50 text-[#18181b] animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-2 mb-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#c26d45]">
                    Кухонный фартук
                  </span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={backsplashConfig.enabled}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          backsplashConfig: {
                            ...backsplashConfig,
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="rounded accent-[#18181b]"
                    />
                    <span>Вкл</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Тип фартука
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['плитка', 'стекло', 'камень', 'панель'] as const).map(
                        (t) => (
                          <button
                            key={t}
                            onClick={() =>
                              onUpdateProject({
                                ...project,
                                backsplashConfig: {
                                  ...backsplashConfig,
                                  type: t
                                }
                              })
                            }
                            className={`py-1 text-xs font-semibold rounded border capitalize text-center ${
                              backsplashConfig.type === t
                                ? 'bg-[#18181b] text-white border-[#18181b]'
                                : 'bg-white text-[#52525b] border-[#e4e6eb]'
                            }`}
                          >
                            {t}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Цвет / Оттенок
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Керамогранит серый', hex: '#e5e7eb' },
                        { name: 'Белый глянец', hex: '#f8fafc' },
                        { name: 'Стекло графит', hex: '#334155' },
                        { name: 'Теплый песочный', hex: '#d6cec2' }
                      ].map((col) => (
                        <button
                          key={col.hex}
                          onClick={() =>
                            onUpdateProject({
                              ...project,
                              backsplashConfig: {
                                ...backsplashConfig,
                                colorHex: col.hex
                              }
                            })
                          }
                          title={col.name}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            backsplashConfig.colorHex === col.hex
                              ? 'ring-2 ring-[#c26d45] scale-110'
                              : 'border-[#d4d4d8]'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-1">
                      Высота фартука
                    </label>
                    <input
                      type="number"
                      value={backsplashConfig.height}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          backsplashConfig: {
                            ...backsplashConfig,
                            height: Number(e.target.value) || 600
                          }
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#e4e6eb] mx-0.5" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#f4f4f5] px-1.5 py-0.5 rounded text-xs font-mono text-[#52525b]">
            <button
              onClick={() => setZoom(Math.max(0.12, zoom - 0.03))}
              className="p-1 hover:text-black"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-10 text-center font-bold">
              {Math.round(zoom * 400)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(0.5, zoom + 0.03))}
              className="p-1 hover:text-black"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(0.24)}
              title="Сбросить масштаб"
              className="p-1 hover:text-black ml-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-[#27272a] text-white px-3 py-1 text-xs font-semibold rounded shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>

      {/* SMART WARNINGS SLIDE-DOWN DRAWER */}
      {activeSettingsPopover === 'warnings' && warnings.length > 0 && (
        <div className="bg-[#fffbeb] border-b border-[#fef3c7] p-3 px-6 z-10 flex items-start justify-between shadow-xs animate-in slide-in-from-top-1 duration-150">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Предупреждения планировки кухни ({warnings.length}):
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="bg-white/90 p-2 rounded border border-amber-200/80 flex items-start gap-2"
                >
                  {w.type === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  ) : w.type === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#18181b] text-[11px]">
                      {w.title}
                    </div>
                    <div className="text-[11px] text-[#52525b] mt-0.5">
                      {w.message}
                    </div>
                  </div>
                  {w.moduleId && (
                    <button
                      onClick={() => setSelectedModuleId(w.moduleId!)}
                      className="text-[10px] font-semibold text-[#c26d45] hover:underline shrink-0"
                    >
                      Показать
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveSettingsPopover(null)}
            className="p-1 text-[#71717a] hover:text-[#18181b]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3-COLUMN MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: KITCHEN MODULE LIBRARY */}
        <aside className="w-76 bg-white border-r border-[#e4e6eb] flex flex-col shrink-0 select-none shadow-xs">
          {/* Categories Tab Header */}
          <div className="p-3 border-b border-[#e4e6eb]">
            <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider mb-2">
              Каталог кухни
            </div>

            {/* 4 Required Categories */}
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  'НИЖНИЕ МОДУЛИ',
                  'ВЕРХНИЕ МОДУЛИ',
                  'ПЕНАЛЫ',
                  'ТЕХНИКА'
                ] as const
              ).map((cat) => {
                const isActive = libraryCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setLibraryCategory(cat)}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all ${
                      isActive
                        ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                        : 'bg-white text-[#52525b] border-[#e4e6eb] hover:border-[#b4b7bd]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module thumbnails list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredTemplates.map((template, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(template));
                  e.dataTransfer.effectAllowed = 'copy';
                  setIsLibraryItemDragging(true);
                }}
                onDragEnd={() => {
                  setIsLibraryItemDragging(false);
                  setDragOverCanvasX(null);
                }}
                onClick={() => handleAddModule(template)}
                title="Кликните для добавления или перетащите мышью на стену кухни"
                className="group p-2.5 bg-[#fafafa] hover:bg-[#faf6f3] border border-[#e4e6eb] hover:border-[#c26d45] rounded-xl cursor-grab active:cursor-grabbing transition-all flex items-center gap-3 relative shadow-2xs hover:shadow-xs select-none"
              >
                {/* SVG Visual Representation */}
                <div className="w-13 h-13 bg-white border border-[#e4e6eb] rounded-lg flex items-center justify-center shrink-0 p-1 group-hover:border-[#c26d45]/40 transition-colors">
                  <svg
                    viewBox="0 0 60 60"
                    className="w-full h-full stroke-[#334155] fill-none stroke-[1.5]"
                  >
                    {template.subCategory === 'НИЖНИЕ МОДУЛИ' && (
                      <>
                        <rect
                          x="6"
                          y="10"
                          width="48"
                          height="42"
                          rx="1"
                          fill="#f8fafc"
                        />
                        <line x1="6" y1="52" x2="54" y2="52" stroke="#94a3b8" />
                        {template.drawersCount === 3 ? (
                          <>
                            <line x1="6" y1="24" x2="54" y2="24" />
                            <line x1="6" y1="38" x2="54" y2="38" />
                            <circle cx="30" cy="17" r="1.5" fill="#000" />
                            <circle cx="30" cy="31" r="1.5" fill="#000" />
                            <circle cx="30" cy="45" r="1.5" fill="#000" />
                          </>
                        ) : template.drawersCount === 4 ? (
                          <>
                            <line x1="6" y1="20.5" x2="54" y2="20.5" />
                            <line x1="6" y1="31" x2="54" y2="31" />
                            <line x1="6" y1="41.5" x2="54" y2="41.5" />
                            <line
                              x1="26"
                              y1="15"
                              x2="34"
                              y2="15"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="26"
                              y1="25.5"
                              x2="34"
                              y2="25.5"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="26"
                              y1="36"
                              x2="34"
                              y2="36"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="26"
                              y1="46.5"
                              x2="34"
                              y2="46.5"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                          </>
                        ) : template.type === 'base_cargo' ? (
                          <>
                            <line
                              x1="6"
                              y1="25"
                              x2="54"
                              y2="25"
                              strokeDasharray="2 2"
                            />
                            <line
                              x1="6"
                              y1="40"
                              x2="54"
                              y2="40"
                              strokeDasharray="2 2"
                            />
                            <line
                              x1="30"
                              y1="16"
                              x2="30"
                              y2="46"
                              stroke="#000"
                              strokeWidth="2"
                            />
                          </>
                        ) : template.cutoutType === 'sink' ? (
                          <>
                            <line x1="30" y1="10" x2="30" y2="52" />
                            <rect
                              x="14"
                              y="16"
                              width="32"
                              height="20"
                              rx="2"
                              stroke="#0284c7"
                              fill="#f0f9ff"
                            />
                            <circle cx="30" cy="26" r="3" stroke="#0284c7" />
                          </>
                        ) : template.cutoutType === 'cooktop' ? (
                          <>
                            <rect
                              x="12"
                              y="18"
                              width="36"
                              height="26"
                              rx="1"
                              fill="#0f172a"
                            />
                            <circle
                              cx="30"
                              cy="31"
                              r="7"
                              stroke="#f97316"
                              strokeWidth="1"
                            />
                          </>
                        ) : template.facadesCount === 2 ? (
                          <>
                            <line x1="30" y1="10" x2="30" y2="52" />
                            <line
                              x1="26"
                              y1="28"
                              x2="26"
                              y2="34"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="34"
                              y1="28"
                              x2="34"
                              y2="34"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                          </>
                        ) : (
                          <>
                            <line
                              x1="6"
                              y1="31"
                              x2="54"
                              y2="31"
                              strokeDasharray="2 2"
                              stroke="#cbd5e1"
                            />
                            <line
                              x1="46"
                              y1="28"
                              x2="46"
                              y2="34"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                          </>
                        )}
                        <line x1="14" y1="52" x2="14" y2="58" stroke="#64748b" />
                        <line x1="46" y1="52" x2="46" y2="58" stroke="#64748b" />
                      </>
                    )}

                    {template.subCategory === 'ВЕРХНИЕ МОДУЛИ' && (
                      <>
                        <rect
                          x="8"
                          y="10"
                          width="44"
                          height="40"
                          rx="1"
                          fill="#f8fafc"
                        />
                        {template.glassFront ? (
                          <>
                            <rect
                              x="13"
                              y="15"
                              width="34"
                              height="30"
                              stroke="#0284c7"
                              strokeDasharray="1 1"
                              fill="#f0f9ff"
                            />
                            <line
                              x1="13"
                              y1="30"
                              x2="47"
                              y2="30"
                              stroke="#0284c7"
                            />
                          </>
                        ) : template.type === 'wall_drying' ? (
                          <>
                            <line x1="30" y1="10" x2="30" y2="50" />
                            <line
                              x1="12"
                              y1="25"
                              x2="48"
                              y2="25"
                              stroke="#0284c7"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="12"
                              y1="38"
                              x2="48"
                              y2="38"
                              stroke="#0284c7"
                              strokeWidth="1.5"
                            />
                          </>
                        ) : template.facadesCount === 2 ? (
                          <>
                            <line x1="30" y1="10" x2="30" y2="50" />
                            <circle cx="26" cy="42" r="1.5" fill="#000" />
                            <circle cx="34" cy="42" r="1.5" fill="#000" />
                          </>
                        ) : (
                          <>
                            <line
                              x1="8"
                              y1="30"
                              x2="52"
                              y2="30"
                              strokeDasharray="2 2"
                              stroke="#cbd5e1"
                            />
                            <circle cx="46" cy="42" r="1.5" fill="#000" />
                          </>
                        )}
                      </>
                    )}

                    {template.subCategory === 'ПЕНАЛЫ' && (
                      <>
                        <rect
                          x="16"
                          y="4"
                          width="28"
                          height="52"
                          rx="1"
                          fill="#f8fafc"
                        />
                        <line x1="16" y1="20" x2="44" y2="20" />
                        <line x1="16" y1="40" x2="44" y2="40" />
                        {template.type === 'tall_oven' && (
                          <rect
                            x="18"
                            y="22"
                            width="24"
                            height="16"
                            fill="#0f172a"
                            rx="1"
                          />
                        )}
                      </>
                    )}

                    {template.subCategory === 'ТЕХНИКА' && (
                      <>
                        {template.applianceType === 'fridge' ? (
                          <>
                            <rect
                              x="16"
                              y="4"
                              width="28"
                              height="52"
                              rx="2"
                              fill="#475569"
                            />
                            <line
                              x1="16"
                              y1="24"
                              x2="44"
                              y2="24"
                              stroke="#fff"
                            />
                            <line
                              x1="41"
                              y1="12"
                              x2="41"
                              y2="18"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                            <line
                              x1="41"
                              y1="30"
                              x2="41"
                              y2="38"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                          </>
                        ) : template.applianceType === 'cooktop' ? (
                          <>
                            <rect
                              x="8"
                              y="20"
                              width="44"
                              height="20"
                              rx="2"
                              fill="#0f172a"
                            />
                            <circle
                              cx="20"
                              cy="30"
                              r="4"
                              stroke="#f97316"
                              fill="none"
                            />
                            <circle
                              cx="40"
                              cy="30"
                              r="4"
                              stroke="#f97316"
                              fill="none"
                            />
                          </>
                        ) : template.applianceType === 'sink' ? (
                          <>
                            <rect
                              x="8"
                              y="16"
                              width="44"
                              height="28"
                              rx="2"
                              fill="#e2e8f0"
                              stroke="#64748b"
                            />
                            <circle cx="24" cy="30" r="8" stroke="#475569" />
                            <path
                              d="M40 24 L40 28"
                              stroke="#0284c7"
                              strokeWidth="2"
                            />
                          </>
                        ) : template.applianceType === 'hood' ? (
                          <>
                            <path
                              d="M20 10 L40 10 L40 26 L52 40 L8 40 L20 26 Z"
                              fill="#334155"
                            />
                          </>
                        ) : (
                          <>
                            <rect
                              x="10"
                              y="12"
                              width="40"
                              height="36"
                              rx="2"
                              fill="#0f172a"
                            />
                            <circle cx="30" cy="30" r="10" stroke="#f97316" />
                          </>
                        )}
                      </>
                    )}
                  </svg>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#18181b] truncate group-hover:text-[#c26d45] transition-colors">
                    {template.name}
                  </div>
                  <div className="text-[11px] text-[#71717a] font-mono mt-0.5">
                    {template.width} × {template.height} × {template.depth} мм
                  </div>
                  <div className="text-[10px] text-[#9ca3af] mt-0.5">
                    {template.isAppliance ? (
                      <span className="text-blue-600 font-semibold">
                        Бытовая техника
                      </span>
                    ) : template.cutoutType === 'sink' ? (
                      <span className="text-cyan-600">Вырез под мойку</span>
                    ) : template.cutoutType === 'cooktop' ? (
                      <span className="text-orange-600">
                        Вырез под панель
                      </span>
                    ) : (
                      `${template.shelvesCount} пол. · ${template.facadesCount} фас.`
                    )}
                  </div>
                </div>

                <button
                  title="Добавить на стену кухни"
                  className="opacity-0 group-hover:opacity-100 p-1.5 bg-[#18181b] text-white rounded transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER COLUMN: WORKSPACE WITH HORIZONTAL SCROLLING FOR LONG WALLS */}
        <main
          ref={canvasScrollRef}
          onClick={() => setSelectedModuleId(null)}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#ebedef] flex items-center justify-start p-10 select-none cursor-default"
        >
          {/* Subtle millimeter room grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
              backgroundSize: `${100 * zoom}px ${100 * zoom}px`
            }}
          />

          {/* Top Floating Wall Dimensions & Info Card */}
          <div className="absolute top-3 left-4 z-30 bg-white/95 backdrop-blur-xs border border-[#cbd5e1] rounded-lg px-3 py-1.5 shadow-md flex items-center gap-3 text-xs pointer-events-auto">
            <div className="flex items-center gap-2 font-bold text-[#18181b]">
              <span className="text-[#64748b] text-[11px] font-medium">Стена кухни:</span>
              <span className="font-mono text-xs text-[#c26d45]">{project.roomDimensions.width} мм × {project.roomDimensions.height} мм</span>
            </div>
            <div className="h-3 w-px bg-[#cbd5e1]" />
            <div className="text-[11px] text-[#52525b]">
              Модулей: <strong className="text-[#18181b]">{project.modules.length}</strong>
            </div>
          </div>

          {/* ROOM WALL CONTAINER */}
          {viewMode === '2D_front' ? (
            <div
              ref={wallRef}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                if (wallRef.current) {
                  const rect = wallRef.current.getBoundingClientRect();
                  const mmX = Math.round((e.clientX - rect.left) / zoom);
                  setDragOverCanvasX(mmX);
                }
              }}
              onDragLeave={() => setDragOverCanvasX(null)}
              onDrop={handleDropFromLibrary}
              className={`relative bg-white border-2 transition-all my-auto shrink-0 ${
                isLibraryItemDragging
                  ? 'border-[#c26d45] border-dashed shadow-2xl'
                  : 'border-[#94a3b8] shadow-2xl'
              }`}
              style={{
                width: `${project.roomDimensions.width * zoom}px`,
                height: `${project.roomDimensions.height * zoom}px`
              }}
            >
              {/* Library drag ghost guide line */}
              {dragOverCanvasX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#c26d45] z-50 pointer-events-none"
                  style={{ left: `${dragOverCanvasX * zoom}px` }}
                >
                  <div className="absolute top-3 left-2 bg-[#18181b] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c26d45] animate-ping" />
                    <span>Разместить: {dragOverCanvasX} мм</span>
                  </div>
                </div>
              )}
              {/* 1. VISIBLE ROOM/WALL DIMENSIONS (Prompt requirement: Ширина стены / Высота стены) */}
              {showDimensions && (
                <>
                  {/* Top Wall Width Dimension Callout */}
                  <div className="absolute -top-9 left-0 right-0 flex items-center justify-between border-t-2 border-b-2 border-[#475569] py-0.5 px-3 text-xs font-mono font-bold text-[#1e293b] bg-white/90 backdrop-blur-2xs shadow-2xs pointer-events-none">
                    <span>|</span>
                    <span className="flex items-center gap-2">
                      <span className="uppercase text-[10px] text-[#64748b]">
                        Ширина стены:
                      </span>
                      <span>{project.roomDimensions.width} мм</span>
                    </span>
                    <span>|</span>
                  </div>

                  {/* Left Wall Height Dimension Callout */}
                  <div className="absolute -left-14 top-0 bottom-0 flex flex-col items-center justify-between border-l-2 border-r-2 border-[#475569] px-0.5 py-3 text-xs font-mono font-bold text-[#1e293b] bg-white/90 backdrop-blur-2xs shadow-2xs pointer-events-none">
                    <span>—</span>
                    <span className="-rotate-90 whitespace-nowrap flex items-center gap-2">
                      <span className="uppercase text-[10px] text-[#64748b]">
                        Высота стены:
                      </span>
                      <span>{project.roomDimensions.height} мм</span>
                    </span>
                    <span>—</span>
                  </div>
                </>
              )}

              {/* 6. WALL / BACKSPLASH (Фартук) */}
              {backsplashConfig.enabled && (
                <div
                  className="absolute left-0 right-0 border-t border-b border-[#cbd5e1] pointer-events-none transition-all shadow-inner overflow-hidden"
                  style={{
                    bottom: `${
                      (plinthConfig.height + 720 + countertopConfig.thickness) *
                      zoom
                    }px`,
                    height: `${backsplashConfig.height * zoom}px`,
                    backgroundColor: backsplashConfig.colorHex,
                    backgroundImage:
                      backsplashConfig.type === 'плитка'
                        ? `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`
                        : undefined,
                    backgroundSize:
                      backsplashConfig.type === 'плитка' ? '60px 30px' : undefined
                  }}
                >
                  <div className="absolute right-3 top-2 bg-black/40 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                    Фартук ({backsplashConfig.type}): {backsplashConfig.height} мм
                  </div>
                </div>
              )}

              {/* 5. PLINTH / ЦОКОЛЬ under lower cabinets */}
              {plinthConfig.enabled && (
                <div
                  className="absolute bottom-0 left-0 right-0 border-t flex items-center justify-between px-3 text-[10px] font-mono transition-all z-10"
                  style={{
                    height: `${plinthConfig.height * zoom}px`,
                    backgroundColor: plinthConfig.colorHex,
                    color:
                      plinthConfig.colorHex === '#18181b'
                        ? '#cbd5e1'
                        : '#18181b',
                    borderColor: '#94a3b8'
                  }}
                >
                  <span>Цоколь ({plinthConfig.height} мм)</span>
                  <span className="opacity-80">{plinthConfig.material}</span>
                </div>
              )}

              {/* 4. COUNTERTOP with CUTOUTS FOR SINK AND COOKTOP */}
              {countertopConfig.enabled && hasBaseCabinets && (
                <div
                  className="absolute border border-black/40 shadow-md z-20 pointer-events-none transition-all flex items-center justify-between px-2 text-[10px] font-mono text-white"
                  style={{
                    left: `${minBaseX * zoom}px`,
                    width: `${totalBaseWidth * zoom}px`,
                    bottom: `${(plinthConfig.height + 720) * zoom}px`,
                    height: `${countertopConfig.thickness * zoom}px`,
                    backgroundColor: countertopConfig.colorHex
                  }}
                >
                  <span className="truncate">
                    Столешница {countertopConfig.thickness} мм ({countertopConfig.material})
                  </span>

                  {/* Openings/cutouts representation */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {sinkModules.map((s) => (
                      <div
                        key={s.id}
                        className="absolute top-0 bottom-0 border-2 border-dashed border-cyan-400 bg-cyan-900/60 flex items-center justify-center text-[9px] text-cyan-200 font-bold px-1"
                        style={{
                          left: `${(s.x - minBaseX) * zoom}px`,
                          width: `${s.width * zoom}px`
                        }}
                      >
                        <span>Вырез под мойку</span>
                      </div>
                    ))}

                    {cooktopModules.map((c) => (
                      <div
                        key={c.id}
                        className="absolute top-0 bottom-0 border-2 border-dashed border-orange-400 bg-orange-900/60 flex items-center justify-center text-[9px] text-orange-200 font-bold px-1"
                        style={{
                          left: `${(c.x - minBaseX) * zoom}px`,
                          width: `${c.width * zoom}px`
                        }}
                      >
                        <span>Вырез под варочную панель</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SMART ALIGNMENT GUIDES (Visual indicators when snapping) */}
              {activeSnapGuideX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#c26d45] z-40 pointer-events-none"
                  style={{ left: `${activeSnapGuideX * zoom}px` }}
                >
                  <div className="absolute top-2 left-1.5 bg-[#c26d45] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                    {snapGuideLabel || `${activeSnapGuideX} мм`}
                  </div>
                </div>
              )}

              {activeSnapGuideY !== null && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-[#2563eb] z-40 pointer-events-none"
                  style={{ bottom: `${activeSnapGuideY * zoom}px` }}
                >
                  <div className="absolute -top-5 right-2 bg-[#2563eb] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                    Высота: {activeSnapGuideY} мм
                  </div>
                </div>
              )}

              {/* MODULES ON CANVAS */}
              {project.modules.map((mod, idx) => {
                const isSelected = mod.id === selectedModuleId;
                const modW = mod.width * zoom;
                const modH = mod.height * zoom;
                const modLeft = mod.x * zoom;
                const modBottom = mod.y * zoom;

                // Check if module has active warnings
                const modWarnings = warnings.filter((w) => w.moduleId === mod.id);

                return (
                  <div
                    key={mod.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModuleId(mod.id);
                    }}
                    onMouseDown={(e) => handleMouseDownModule(e, mod)}
                    className={`absolute cursor-move transition-shadow flex flex-col justify-between overflow-hidden select-none ${
                      isSelected
                        ? 'ring-2 ring-[#c26d45] ring-offset-2 shadow-xl z-30'
                        : 'border border-[#64748b] hover:border-[#334155] hover:shadow-md z-20'
                    }`}
                    style={{
                      left: `${modLeft}px`,
                      bottom: `${modBottom}px`,
                      width: `${modW}px`,
                      height: `${modH}px`,
                      backgroundColor: mod.facadeColorHex || '#d8cebf'
                    }}
                  >
                    {/* Lock Indicator */}
                    {mod.isLocked && (
                      <div className="absolute top-1 right-1 bg-black/75 text-white p-0.5 rounded z-20">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}

                    {/* Warning Dot Badge */}
                    {modWarnings.length > 0 && (
                      <div
                        title={modWarnings.map((w) => w.title).join('; ')}
                        className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-0.5 z-20 animate-pulse"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                      </div>
                    )}

                    {/* Top Bar / Module Name */}
                    <div className="p-1 bg-black/35 backdrop-blur-2xs text-white text-[10px] font-semibold flex items-center justify-between overflow-hidden">
                      <span className="truncate">{mod.name}</span>
                      <span className="text-[9px] font-mono shrink-0 ml-1 opacity-90">
                        №{idx + 1}
                      </span>
                    </div>

                    {/* Module Graphic Simulation */}
                    <div className="flex-1 flex flex-col justify-around p-1 relative pointer-events-none">
                      {mod.isAppliance ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-black/10 rounded">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                            {mod.applianceType || 'Техника'}
                          </span>
                        </div>
                      ) : mod.glassFront ? (
                        <div className="w-full h-full border border-sky-400/50 bg-sky-200/20 rounded flex items-center justify-center">
                          <span className="text-[9px] font-mono text-sky-800 bg-white/70 px-1 rounded">
                            Стекло
                          </span>
                        </div>
                      ) : mod.drawersCount > 0 ? (
                        Array.from({ length: mod.drawersCount }).map((_, dIdx) => (
                          <div
                            key={dIdx}
                            className="w-full border-t border-b border-black/20 flex items-center justify-center py-1"
                          >
                            <div className="w-8 h-0.5 bg-black/70 rounded" />
                          </div>
                        ))
                      ) : mod.facadesCount === 2 ? (
                        <div className="w-full h-full flex">
                          <div className="flex-1 border-r border-black/20 flex items-center justify-end pr-1">
                            <div className="w-0.5 h-5 bg-black/80 rounded" />
                          </div>
                          <div className="flex-1 flex items-center justify-start pl-1">
                            <div className="w-0.5 h-5 bg-black/80 rounded" />
                          </div>
                        </div>
                      ) : mod.facadesCount === 1 ? (
                        <div className="w-full h-full flex items-center justify-end pr-1.5">
                          <div className="w-0.5 h-5 bg-black/80 rounded" />
                        </div>
                      ) : (
                        Array.from({ length: mod.shelvesCount }).map((_, sIdx) => (
                          <div key={sIdx} className="w-full h-0.5 bg-black/30" />
                        ))
                      )}
                    </div>

                    {/* Dimension Tag in mm */}
                    {showDimensions && (
                      <div className="bg-black/75 text-white font-mono text-[9px] px-1 py-0.5 text-center pointer-events-none">
                        {mod.width} × {mod.height} × {mod.depth}
                      </div>
                    )}

                    {/* Selected Module Info Floating Pill */}
                    {isSelected && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#18181b] text-white px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 z-40 text-[10px] whitespace-nowrap font-mono">
                        <span>X: {mod.x}</span>
                        <span>·</span>
                        <span>Y: {mod.y}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 2D СВЕРХУ (TOP-DOWN PLAN VIEW) */
            <div
              className="relative bg-[#ffffff] border-2 border-[#94a3b8] shadow-2xl transition-all my-auto shrink-0"
              style={{
                width: `${project.roomDimensions.width * zoom}px`,
                height: `${(project.roomDimensions.depth || 2400) * zoom * 0.4}px`
              }}
            >
              {/* Room Top Dimensions */}
              <div className="absolute -top-8 left-0 right-0 flex items-center justify-between border-b-2 border-[#475569] text-xs font-mono font-bold text-[#18181b] px-2 py-0.5 bg-white/80 pointer-events-none">
                <span>План сверху: Ширина стены {project.roomDimensions.width} мм</span>
                <span>Глубина: {project.roomDimensions.depth || 2400} мм</span>
              </div>

              {/* Back wall representation (top border) */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-[#334155] border-b border-black text-[9px] text-white px-2 flex items-center">
                Задняя несущая стена
              </div>

              {/* Countertop depth slab from above */}
              {countertopConfig.enabled && hasBaseCabinets && (
                <div
                  className="absolute top-3 border border-[#18181b] shadow-xs flex items-center justify-center text-[10px] font-mono text-white"
                  style={{
                    left: `${minBaseX * zoom}px`,
                    width: `${totalBaseWidth * zoom}px`,
                    height: `${countertopConfig.depth * zoom}px`,
                    backgroundColor: countertopConfig.colorHex
                  }}
                >
                  <span>Столешница {countertopConfig.depth} мм (свес над базой)</span>
                </div>
              )}

              {/* Modules from above */}
              {project.modules.map((mod, idx) => {
                const isSelected = mod.id === selectedModuleId;
                const isUpper = mod.y > 1000;
                const isRotated = mod.rotation === 90 || mod.rotation === 270;
                const modW = (isRotated ? mod.depth : mod.width) * zoom;
                const modD = (isRotated ? mod.width : mod.depth) * zoom;
                const modLeft = (isRotated ? (mod.x || 0) : mod.x) * zoom;
                const modTop = 12 + (isRotated ? (mod.z || 0) : mod.z || 0) * zoom;

                return (
                  <div
                    key={mod.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModuleId(mod.id);
                    }}
                    className={`absolute cursor-pointer p-1 flex flex-col justify-between select-none ${
                      isUpper
                        ? 'border-2 border-dashed border-sky-600 bg-sky-50/70 z-30'
                        : isSelected
                        ? 'ring-2 ring-[#c26d45] border border-black z-20 shadow-md'
                        : 'border border-black/40 bg-[#f4f5f7] z-10'
                    }`}
                    style={{
                      left: `${modLeft}px`,
                      top: `${modTop}px`,
                      width: `${modW}px`,
                      height: `${modD}px`
                    }}
                  >
                    <div className="text-[9px] font-bold truncate text-[#18181b]">
                      {isUpper ? `[Верх] ${mod.name}` : mod.name}
                    </div>

                    {/* Sink / Cooktop Cutouts from above */}
                    {mod.cutoutType === 'sink' ? (
                      <div className="w-full h-8 border border-cyan-500 bg-cyan-100 rounded flex items-center justify-center text-[8px] text-cyan-800 font-bold">
                        Мойка (чаша + смеситель)
                      </div>
                    ) : mod.cutoutType === 'cooktop' ? (
                      <div className="w-full h-8 border border-orange-500 bg-orange-100 rounded flex items-center justify-center text-[8px] text-orange-800 font-bold">
                        Варочная поверхность (конфорки)
                      </div>
                    ) : null}

                    <div className="text-[9px] font-mono text-[#52525b]">
                      {mod.width} × {mod.depth} мм
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: DETAILED PROPERTIES PANEL (Prompt requirement 3) */}
        <aside className="w-80 bg-white border-l border-[#e4e6eb] flex flex-col shrink-0 select-none overflow-y-auto">
          {currentModule ? (
            <div className="p-4 space-y-4">
              {/* Header: Title and Quick Tools */}
              <div className="border-b border-[#e4e6eb] pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#c26d45] uppercase tracking-wider">
                    {currentModule.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleToggleLock}
                      title={
                        currentModule.isLocked
                          ? 'Разблокировать'
                          : 'Заблокировать'
                      }
                      className={`p-1 rounded ${
                        currentModule.isLocked
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-[#71717a] hover:bg-[#f4f4f5]'
                      }`}
                    >
                      {currentModule.isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleDuplicate}
                      title="Дублировать"
                      className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      title="Удалить"
                      className="p-1 text-[#71717a] hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#c26d45] bg-[#faf3ee] px-2 py-0.5 rounded border border-[#f0ded4]">
                    №{currentModuleIndex + 1}
                  </span>
                  <input
                    type="text"
                    value={currentModule.name}
                    onChange={(e) =>
                      handleUpdateCurrentModule({ name: e.target.value })
                    }
                    className="flex-1 font-bold text-sm text-[#18181b] bg-transparent border-b border-transparent hover:border-[#d4d4d8] focus:border-[#18181b] focus:outline-none py-1"
                  />
                </div>
              </div>

              {/* 1. РАЗМЕРЫ (Ширина, Высота, Глубина в мм) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  РАЗМЕРЫ
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Ширина
                    </label>
                    <input
                      type="number"
                      step={50}
                      min={150}
                      max={2400}
                      value={currentModule.width}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          width: Number(e.target.value)
                        })
                      }
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-[#fafafa] border border-[#d4d4d8] rounded focus:outline-none focus:border-[#18181b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Высота
                    </label>
                    <input
                      type="number"
                      step={20}
                      min={150}
                      max={2800}
                      value={currentModule.height}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          height: Number(e.target.value)
                        })
                      }
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-[#fafafa] border border-[#d4d4d8] rounded focus:outline-none focus:border-[#18181b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Глубина
                    </label>
                    <input
                      type="number"
                      step={10}
                      min={150}
                      max={1200}
                      value={currentModule.depth}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          depth: Number(e.target.value)
                        })
                      }
                      className="w-full px-2 py-1 text-xs font-mono font-bold bg-[#fafafa] border border-[#d4d4d8] rounded focus:outline-none focus:border-[#18181b]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Позиция X (мм)
                    </label>
                    <input
                      type="number"
                      step={10}
                      min={0}
                      value={currentModule.x}
                      onChange={(e) =>
                        handleUpdateCurrentModule({ x: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded focus:outline-none focus:border-[#18181b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Позиция Y (мм)
                    </label>
                    <input
                      type="number"
                      step={10}
                      min={0}
                      value={currentModule.y}
                      onChange={(e) =>
                        handleUpdateCurrentModule({ y: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded focus:outline-none focus:border-[#18181b]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. КОНСТРУКЦИЯ (Полки, Фасады, Ящики) */}
              <div className="space-y-2 pt-2 border-t border-[#f0f0f2]">
                <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  КОНСТРУКЦИЯ
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#52525b]">Полки:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          handleUpdateCurrentModule({
                            shelvesCount: Math.max(
                              0,
                              currentModule.shelvesCount - 1
                            )
                          })
                        }
                        className="w-6 h-6 border border-[#d4d4d8] rounded flex items-center justify-center hover:bg-[#f4f4f5] font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold">
                        {currentModule.shelvesCount}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateCurrentModule({
                            shelvesCount: currentModule.shelvesCount + 1
                          })
                        }
                        className="w-6 h-6 border border-[#d4d4d8] rounded flex items-center justify-center hover:bg-[#f4f4f5] font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#52525b]">Фасады:</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() =>
                            handleUpdateCurrentModule({ facadesCount: num })
                          }
                          className={`w-6 h-6 text-xs font-semibold rounded ${
                            currentModule.facadesCount === num
                              ? 'bg-[#18181b] text-white'
                              : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#eaeaea]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#52525b]">Ящики:</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() =>
                            handleUpdateCurrentModule({
                              drawersCount: num,
                              facadesCount:
                                num > 0 ? num : currentModule.facadesCount
                            })
                          }
                          className={`w-6 h-6 text-xs font-semibold rounded ${
                            currentModule.drawersCount === num
                              ? 'bg-[#c26d45] text-white'
                              : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#eaeaea]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. КОРПУС */}
              <div className="space-y-2 pt-2 border-t border-[#f0f0f2]">
                <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  КОРПУС
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Материал
                    </label>
                    <select
                      value={currentModule.carcassMaterial}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          carcassMaterial: e.target.value
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="ЛДСП Egger Белый Базовый">ЛДСП Egger Белый</option>
                      <option value="ЛДСП Egger Дуб Галифакс">ЛДСП Дуб Галифакс</option>
                      <option value="ЛДСП Kronospan Кашемир">ЛДСП Кашемир</option>
                      <option value="ЛДСП Графит">ЛДСП Графит</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Толщина
                    </label>
                    <select
                      value={currentModule.carcassThickness || 18}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          carcassThickness: Number(e.target.value)
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded font-mono"
                    >
                      <option value={16}>16 мм</option>
                      <option value={18}>18 мм</option>
                      <option value={22}>22 мм</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. ФАСАД (Материал, Толщина, Цвет, Текстура) */}
              <div className="space-y-2 pt-2 border-t border-[#f0f0f2]">
                <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  ФАСАД
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Материал
                    </label>
                    <select
                      value={currentModule.facadeMaterial}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          facadeMaterial: e.target.value
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="МДФ 19 мм Эмаль Матовая">
                        МДФ Эмаль
                      </option>
                      <option value="МДФ 19 мм Пленка Soft-Touch">
                        МДФ Soft-Touch
                      </option>
                      <option value="AGT Пластик Supramat">
                        AGT Пластик
                      </option>
                      <option value="Шпон Ореха">Шпон Ореха</option>
                      <option value="ЛДСП 18 мм">ЛДСП в кромке</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Толщина
                    </label>
                    <select
                      value={currentModule.facadeThickness || 19}
                      onChange={(e) =>
                        handleUpdateCurrentModule({
                          facadeThickness: Number(e.target.value)
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded font-mono"
                    >
                      <option value={16}>16 мм</option>
                      <option value={19}>19 мм</option>
                      <option value={22}>22 мм</option>
                    </select>
                  </div>
                </div>

                {/* Facade Color Swatches */}
                <div>
                  <label className="block text-[10px] text-[#71717a] mb-1">
                    Цвет фасада: {currentModule.facadeColor}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { name: 'Кашемир', hex: '#d8cebf' },
                      { name: 'Графит', hex: '#373f43' },
                      { name: 'Белый теплый', hex: '#fcfcfc' },
                      { name: 'Дуб Галифакс', hex: '#c49a6c' },
                      { name: 'Орех темный', hex: '#6f4e37' },
                      { name: 'Сахара', hex: '#b5a593' }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() =>
                          handleUpdateCurrentModule({
                            facadeColor: col.name,
                            facadeColorHex: col.hex
                          })
                        }
                        title={col.name}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          currentModule.facadeColorHex === col.hex
                            ? 'ring-2 ring-[#c26d45] scale-110'
                            : 'border-[#d4d4d8] hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Facade Texture */}
                <div>
                  <label className="block text-[10px] text-[#71717a] mb-1">
                    Текстура фасада
                  </label>
                  <select
                    value={currentModule.facadeTexture || 'Матовая'}
                    onChange={(e) =>
                      handleUpdateCurrentModule({ facadeTexture: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                  >
                    <option value="Матовая">Матовая шелковистая</option>
                    <option value="Глянец">Высокий глянец (Senosan)</option>
                    <option value="Шагрень">Шагрень micro-texture</option>
                    <option value="Древесная">Синхронные древесные поры</option>
                    <option value="Шелк">Soft-Touch шелк</option>
                  </select>
                </div>
              </div>

              {/* 5. ФУРНИТУРА (Петли, Направляющие, Ручки) */}
              <div className="space-y-2 pt-2 border-t border-[#f0f0f2]">
                <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  ФУРНИТУРА
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Петли
                    </label>
                    <select
                      value={currentModule.hingeType}
                      onChange={(e) =>
                        handleUpdateCurrentModule({ hingeType: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Blum Clip-Top с доводчиком">
                        Blum Clip-Top с доводчиком (Австрия)
                      </option>
                      <option value="Boyard Soft-Close">
                        Boyard Soft-Close 105°
                      </option>
                      <option value="DTC Pivot">DTC Pivot с демпфером</option>
                      <option value="—">Без петель (для ящиков/техники)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Направляющие
                    </label>
                    <select
                      value={currentModule.runnerType}
                      onChange={(e) =>
                        handleUpdateCurrentModule({ runnerType: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Blum Legrabox">
                        Blum Legrabox Pure с доводчиком
                      </option>
                      <option value="Boyard B-Box скрытого монтажа">
                        Boyard B-Box скрытого монтажа
                      </option>
                      <option value="Шариковые">
                        Шариковые полновыкатные 45мм
                      </option>
                      <option value="—">Не применимо (—)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#71717a] mb-0.5">
                      Ручки
                    </label>
                    <select
                      value={currentModule.handleType}
                      onChange={(e) =>
                        handleUpdateCurrentModule({ handleType: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#fafafa] border border-[#d4d4d8] rounded"
                    >
                      <option value="Профиль Gola черный">
                        Профиль Gola черный матовый
                      </option>
                      <option value="Ручка-скоба Loft 160мм">
                        Ручка-скоба Loft 160мм
                      </option>
                      <option value="Без ручек (Push-to-Open)">
                        Без ручек (Push-to-Open / Tip-On)
                      </option>
                      <option value="Интегрированная фрезеровка">
                        Интегрированная ручка J-профиль
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3 Buttons: Дублировать, Заблокировать, Удалить */}
              <div className="pt-3 border-t border-[#e4e6eb] space-y-2">
                <button
                  onClick={handleDuplicate}
                  className="w-full py-2 bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#18181b] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Дублировать</span>
                </button>

                <button
                  onClick={handleToggleLock}
                  className="w-full py-2 bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#18181b] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {currentModule.isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Разблокировать</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Заблокировать</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить модуль</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#71717a]">
              <MousePointer className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">Выберите кухонный модуль</p>
              <p className="text-[11px] text-[#9ca3af] mt-1">
                Кликните на любой шкаф для настройки размеров, вырезов под мойку/плиту, материалов и фурнитуры
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
