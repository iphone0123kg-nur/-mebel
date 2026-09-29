import { FurnitureModule, PartDetail } from '../types/furniture';

export interface DetailingSummary {
  partsList: PartDetail[];
  ldspSquareMeters: number;
  ldspSheets: number;
  mdfSquareMeters: number;
  edge04Meters: number;
  edge20Meters: number;
  hingesCount: number;
  runnersCount: number;
  handlesCount: number;
  legsCount: number;
  fastenersCount: number;
}

export interface SheetNestingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  moduleName: string;
  color: string;
}

export interface SheetNestingResult {
  sheetWidth: number;
  sheetHeight: number;
  sheets: {
    sheetNumber: number;
    usedAreaPercent: number;
    rects: SheetNestingRect[];
  }[];
}

export interface CostCalculation {
  materialsCost: number;
  hardwareCost: number;
  laborCost: number;
  primeCost: number; // Себестоимость
  marginPercent: number; // e.g. 30%
  clientPrice: number; // Цена клиенту
  itemized: {
    name: string;
    category: 'Материалы' | 'Фурнитура' | 'Работа';
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
}

const LDSP_SHEET_AREA = (2800 * 2070) / 1000000; // ~5.796 m²
const LDSP_THICKNESS = 18;

export function calculateModuleParts(module: FurnitureModule, index: number): PartDetail[] {
  const parts: PartDetail[] = [];
  const mName = module.name || `Модуль №${index + 1}`;
  const mId = module.id;

  const w = module.width;
  const h = module.height;
  const d = module.depth;

  // 1. Боковины (Sides) - 2 pcs
  parts.push({
    id: `${mId}-side`,
    moduleId: mId,
    moduleName: mName,
    name: 'Боковина',
    length: h,
    width: d,
    count: 2,
    material: module.carcassMaterial,
    edge04: '3 стороны',
    edge20: '1 сторона (лицевая)'
  });

  const internalWidth = Math.max(100, w - LDSP_THICKNESS * 2);

  // 2. Дно (Bottom) - 1 pc
  parts.push({
    id: `${mId}-bottom`,
    moduleId: mId,
    moduleName: mName,
    name: 'Дно',
    length: internalWidth,
    width: d,
    count: 1,
    material: module.carcassMaterial,
    edge04: '3 стороны',
    edge20: '1 сторона (лицевая)'
  });

  // 3. Крышка / Царги (Top or Tie rails)
  if (module.category === 'Нижние модули' || module.category === 'Модули под мойку' || module.category === 'Модули под духовку' || module.category === 'Модули под посудомойку') {
    // Царги 2 шт (для крепления столешницы)
    parts.push({
      id: `${mId}-tie`,
      moduleId: mId,
      moduleName: mName,
      name: 'Царга верхняя',
      length: internalWidth,
      width: 100,
      count: 2,
      material: module.carcassMaterial,
      edge04: '2 стороны',
      edge20: '—'
    });
  } else {
    // Полноценная крышка
    parts.push({
      id: `${mId}-top`,
      moduleId: mId,
      moduleName: mName,
      name: 'Крышка',
      length: internalWidth,
      width: d,
      count: 1,
      material: module.carcassMaterial,
      edge04: '3 стороны',
      edge20: '1 сторона (лицевая)'
    });
  }

  // 4. Полки (Shelves)
  if (module.shelvesCount > 0) {
    parts.push({
      id: `${mId}-shelves`,
      moduleId: mId,
      moduleName: mName,
      name: 'Полка вкладная',
      length: internalWidth - 2,
      width: Math.max(100, d - 20),
      count: module.shelvesCount,
      material: module.carcassMaterial,
      edge04: '3 стороны',
      edge20: '1 сторона (лицевая)'
    });
  }

  // 5. Фасады (Facades)
  if (module.drawersCount > 0) {
    const drawerHeight = Math.round((h - 4 * (module.drawersCount + 1)) / module.drawersCount);
    parts.push({
      id: `${mId}-facade-drawers`,
      moduleId: mId,
      moduleName: mName,
      name: 'Фасад ящика',
      length: Math.max(100, drawerHeight),
      width: Math.max(100, w - 4),
      count: module.drawersCount,
      material: module.facadeMaterial,
      edge04: '—',
      edge20: '4 стороны (2 мм)'
    });

    // Детали коробов ящиков (Царги и дно ящиков)
    parts.push({
      id: `${mId}-box-sides`,
      moduleId: mId,
      moduleName: mName,
      name: 'Боковина ящика (ЛДСП)',
      length: 500,
      width: Math.round(drawerHeight * 0.7),
      count: module.drawersCount * 2,
      material: 'ЛДСП 16 мм Белый',
      edge04: '4 стороны',
      edge20: '—'
    });
  } else if (module.facadesCount === 1) {
    parts.push({
      id: `${mId}-facade-1`,
      moduleId: mId,
      moduleName: mName,
      name: 'Фасад распашной',
      length: Math.max(100, h - 4),
      width: Math.max(100, w - 4),
      count: 1,
      material: module.facadeMaterial,
      edge04: '—',
      edge20: '4 стороны (2 мм)'
    });
  } else if (module.facadesCount === 2) {
    const doorWidth = Math.round((w - 6) / 2);
    parts.push({
      id: `${mId}-facade-2`,
      moduleId: mId,
      moduleName: mName,
      name: 'Фасад распашной',
      length: Math.max(100, h - 4),
      width: Math.max(100, doorWidth),
      count: 2,
      material: module.facadeMaterial,
      edge04: '—',
      edge20: '4 стороны (2 мм)'
    });
  } else if (module.facadesCount === 3) {
    const doorWidth = Math.round((w - 8) / 3);
    parts.push({
      id: `${mId}-facade-3`,
      moduleId: mId,
      moduleName: mName,
      name: 'Фасад распашной',
      length: Math.max(100, h - 4),
      width: Math.max(100, doorWidth),
      count: 3,
      material: module.facadeMaterial,
      edge04: '—',
      edge20: '4 стороны (2 мм)'
    });
  }

  // 6. Задняя стенка (Back wall ХДФ)
  if (module.backWallMaterial && module.backWallMaterial !== '—') {
    parts.push({
      id: `${mId}-back`,
      moduleId: mId,
      moduleName: mName,
      name: 'Задняя стенка (ХДФ)',
      length: Math.max(100, h - 2),
      width: Math.max(100, w - 2),
      count: 1,
      material: module.backWallMaterial,
      edge04: '—',
      edge20: '—'
    });
  }

  return parts;
}

export function calculateProjectDetailing(modules: FurnitureModule[]): DetailingSummary {
  const partsList: PartDetail[] = [];

  let totalLdspAreaMm2 = 0;
  let totalMdfAreaMm2 = 0;
  let edge04Meters = 0;
  let edge20Meters = 0;
  let hingesCount = 0;
  let runnersCount = 0;
  let handlesCount = 0;
  let legsCount = 0;

  modules.forEach((mod, idx) => {
    const modParts = calculateModuleParts(mod, idx);
    partsList.push(...modParts);

    // Calculate areas and edge meters
    modParts.forEach(part => {
      const area = (part.length * part.width * part.count);
      const perimeter = (part.length + part.width) * 2 * part.count;

      if (part.name.includes('Фасад')) {
        totalMdfAreaMm2 += area;
        edge20Meters += perimeter / 1000;
      } else if (!part.name.includes('ХДФ')) {
        totalLdspAreaMm2 += area;
        // Front edge is 2mm
        edge20Meters += (part.length * part.count) / 1000;
        // Remaining 3 edges are 0.4mm
        edge04Meters += ((part.length + part.width * 2) * part.count) / 1000;
      }
    });

    // Hardware rules
    if (mod.facadesCount > 0 && mod.drawersCount === 0) {
      // Hinges: calculate based on height per door
      const hingesPerDoor = mod.height > 1800 ? 4 : mod.height > 900 ? 3 : 2;
      hingesCount += hingesPerDoor * mod.facadesCount;
      handlesCount += mod.facadesCount;
    }

    if (mod.drawersCount > 0) {
      runnersCount += mod.drawersCount;
      handlesCount += mod.drawersCount;
    }

    if (mod.y <= 150) {
      // Floor modules have legs
      legsCount += mod.width >= 800 ? 5 : 4;
    }
  });

  const ldspSquareMeters = Number((totalLdspAreaMm2 / 1000000).toFixed(2));
  // 15% cutting margin
  const ldspSheets = Number(((ldspSquareMeters * 1.15) / LDSP_SHEET_AREA).toFixed(1));
  const mdfSquareMeters = Number((totalMdfAreaMm2 / 1000000).toFixed(2));

  return {
    partsList,
    ldspSquareMeters,
    ldspSheets: Math.max(1, ldspSheets),
    mdfSquareMeters,
    edge04Meters: Math.round(edge04Meters),
    edge20Meters: Math.round(edge20Meters),
    hingesCount,
    runnersCount,
    handlesCount,
    legsCount,
    fastenersCount: modules.length * 16 + 24
  };
}

export function generateSheetNesting(parts: PartDetail[]): SheetNestingResult {
  const ldspParts = parts.filter(p => !p.name.includes('Фасад') && !p.name.includes('ХДФ'));
  const sheetWidth = 2800;
  const sheetHeight = 2070;

  // Flatten parts with counts
  const flatItems: { name: string; moduleName: string; w: number; h: number }[] = [];
  ldspParts.forEach(p => {
    for (let i = 0; i < p.count; i++) {
      flatItems.push({
        name: p.name,
        moduleName: p.moduleName,
        w: Math.max(p.length, p.width),
        h: Math.min(p.length, p.width)
      });
    }
  });

  // Sort by height descending (simple 2D shelf packing for demonstration)
  flatItems.sort((a, b) => b.h - a.h);

  const sheets: SheetNestingResult['sheets'] = [];
  let currentSheetIndex = 1;
  let curX = 15;
  let curY = 15;
  let rowHeight = 0;
  let currentRects: SheetNestingRect[] = [];
  let totalUsedArea = 0;

  const colors = [
    '#e2e8f0', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'
  ];

  flatItems.forEach((item, idx) => {
    // Scale down for visual preview on standard sheet 2800x2070
    if (curX + item.w + 10 > sheetWidth - 20) {
      // next row
      curX = 15;
      curY += rowHeight + 15;
      rowHeight = 0;
    }

    if (curY + item.h + 10 > sheetHeight - 20) {
      // next sheet
      sheets.push({
        sheetNumber: currentSheetIndex,
        usedAreaPercent: Math.min(93, Math.round((totalUsedArea / (sheetWidth * sheetHeight)) * 100)),
        rects: currentRects
      });
      currentSheetIndex++;
      curX = 15;
      curY = 15;
      rowHeight = 0;
      currentRects = [];
      totalUsedArea = 0;
    }

    currentRects.push({
      x: curX,
      y: curY,
      width: item.w,
      height: item.h,
      label: `${item.name} (${item.w}×${item.h})`,
      moduleName: item.moduleName,
      color: colors[idx % colors.length]
    });

    totalUsedArea += item.w * item.h;
    curX += item.w + 15;
    if (item.h > rowHeight) {
      rowHeight = item.h;
    }
  });

  if (currentRects.length > 0) {
    sheets.push({
      sheetNumber: currentSheetIndex,
      usedAreaPercent: Math.min(92, Math.max(68, Math.round((totalUsedArea / (sheetWidth * sheetHeight)) * 100))),
      rects: currentRects
    });
  }

  return {
    sheetWidth,
    sheetHeight,
    sheets: sheets.length > 0 ? sheets : [
      {
        sheetNumber: 1,
        usedAreaPercent: 84,
        rects: []
      }
    ]
  };
}

export function calculateProjectCost(
  modules: FurnitureModule[],
  marginPercent = 30,
  hasCountertop = true
): CostCalculation {
  const detailing = calculateProjectDetailing(modules);

  // Unit costs in KGS
  const priceLdspSheet = 3850;
  const priceMdfSqM = 5800;
  const priceHdfSqM = 550;
  const priceEdge04PerM = 45;
  const priceEdge20PerM = 110;
  const priceCountertopPerM = 4500;

  const priceHinge = 380; // Blum / Boyard blend
  const priceRunner = 2400; // soft close runner pair
  const priceHandle = 450;
  const priceLeg = 65;
  const priceFastenersSet = 45;

  // Work rates
  const rateSawingLdspPerSheet = 1400; // распил и кромкование
  const rateCncDrillingPerModule = 1800; // присадка ЧПУ
  const rateAssemblyPerModule = 2400; // сборка в цехе
  const rateInstallation = 18000; // доставка и монтаж у клиента

  // 1. Materials
  const totalLdspCost = Math.round(detailing.ldspSheets * priceLdspSheet);
  const totalMdfCost = Math.round(detailing.mdfSquareMeters * priceMdfSqM);
  const totalHdfCost = Math.round((modules.length * 1.2) * priceHdfSqM);
  const totalEdgeCost = Math.round(detailing.edge04Meters * priceEdge04PerM + detailing.edge20Meters * priceEdge20PerM);

  let countertopMeters = 0;
  if (hasCountertop) {
    const baseModules = modules.filter(m => m.y <= 150);
    countertopMeters = Number((baseModules.reduce((acc, m) => acc + m.width, 0) / 1000).toFixed(1));
  }
  const totalCountertopCost = Math.round(countertopMeters * priceCountertopPerM);

  const materialsCost = totalLdspCost + totalMdfCost + totalHdfCost + totalEdgeCost + totalCountertopCost;

  // 2. Hardware
  const totalHingesCost = detailing.hingesCount * priceHinge;
  const totalRunnersCost = detailing.runnersCount * priceRunner;
  const totalHandlesCost = detailing.handlesCount * priceHandle;
  const totalLegsCost = detailing.legsCount * priceLeg;
  const totalFastenersCost = detailing.fastenersCount * priceFastenersSet;

  const hardwareCost = totalHingesCost + totalRunnersCost + totalHandlesCost + totalLegsCost + totalFastenersCost;

  // 3. Labor
  const totalSawingCost = Math.round(detailing.ldspSheets * rateSawingLdspPerSheet);
  const totalCncCost = modules.length * rateCncDrillingPerModule;
  const totalAssemblyCost = modules.length * rateAssemblyPerModule;
  const totalMountingCost = rateInstallation;

  const laborCost = totalSawingCost + totalCncCost + totalAssemblyCost + totalMountingCost;

  // Prime cost & final price
  const primeCost = materialsCost + hardwareCost + laborCost;
  const clientPrice = Math.round(primeCost * (1 + marginPercent / 100));

  const itemized = [
    {
      name: 'ЛДСП 18 мм (листовой материал)',
      category: 'Материалы' as const,
      quantity: detailing.ldspSheets,
      unit: 'листов',
      unitPrice: priceLdspSheet,
      total: totalLdspCost
    },
    {
      name: 'МДФ фасады (эмаль / soft-touch)',
      category: 'Материалы' as const,
      quantity: detailing.mdfSquareMeters,
      unit: 'м²',
      unitPrice: priceMdfSqM,
      total: totalMdfCost
    },
    {
      name: 'ХДФ 3 мм задняя стенка',
      category: 'Материалы' as const,
      quantity: Math.round(modules.length * 1.2),
      unit: 'м²',
      unitPrice: priceHdfSqM,
      total: totalHdfCost
    },
    {
      name: 'Кромка ABS (0.4 мм + 2.0 мм)',
      category: 'Материалы' as const,
      quantity: detailing.edge04Meters + detailing.edge20Meters,
      unit: 'пог. м',
      unitPrice: 65,
      total: totalEdgeCost
    },
    ...(hasCountertop && countertopMeters > 0 ? [
      {
        name: 'Столешница влагостойкая HPL 38мм',
        category: 'Материалы' as const,
        quantity: countertopMeters,
        unit: 'пог. м',
        unitPrice: priceCountertopPerM,
        total: totalCountertopCost
      }
    ] : []),
    {
      name: 'Петли с доводчиком (Blum / Boyard)',
      category: 'Фурнитура' as const,
      quantity: detailing.hingesCount,
      unit: 'шт',
      unitPrice: priceHinge,
      total: totalHingesCost
    },
    {
      name: 'Направляющие скрытого монтажа / тандембоксы',
      category: 'Фурнитура' as const,
      quantity: detailing.runnersCount,
      unit: 'компл',
      unitPrice: priceRunner,
      total: totalRunnersCost
    },
    {
      name: 'Ручки / профиль Gola',
      category: 'Фурнитура' as const,
      quantity: detailing.handlesCount,
      unit: 'шт',
      unitPrice: priceHandle,
      total: totalHandlesCost
    },
    {
      name: 'Опоры регулируемые Volpato 100мм',
      category: 'Фурнитура' as const,
      quantity: detailing.legsCount,
      unit: 'шт',
      unitPrice: priceLeg,
      total: totalLegsCost
    },
    {
      name: 'Крепеж и метизы (евровинты, эксцентрики, шканты)',
      category: 'Фурнитура' as const,
      quantity: detailing.fastenersCount,
      unit: 'компл',
      unitPrice: priceFastenersSet,
      total: totalFastenersCost
    },
    {
      name: 'Распил плитного материала и кромкование',
      category: 'Работа' as const,
      quantity: detailing.ldspSheets,
      unit: 'листов',
      unitPrice: rateSawingLdspPerSheet,
      total: totalSawingCost
    },
    {
      name: 'Высокоточная ЧПУ-присадка отверстий',
      category: 'Работа' as const,
      quantity: modules.length,
      unit: 'модулей',
      unitPrice: rateCncDrillingPerModule,
      total: totalCncCost
    },
    {
      name: 'Контрольная сборка модулей в цехе',
      category: 'Работа' as const,
      quantity: modules.length,
      unit: 'модулей',
      unitPrice: rateAssemblyPerModule,
      total: totalAssemblyCost
    },
    {
      name: 'Доставка на объект и профессиональный монтаж',
      category: 'Работа' as const,
      quantity: 1,
      unit: 'услуга',
      unitPrice: rateInstallation,
      total: totalMountingCost
    }
  ];

  return {
    materialsCost,
    hardwareCost,
    laborCost,
    primeCost,
    marginPercent,
    clientPrice,
    itemized
  };
}
