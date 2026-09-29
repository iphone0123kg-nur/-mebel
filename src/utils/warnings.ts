import { FurnitureModule, RoomDimensions, SmartWarning } from '../types/furniture';

export function checkKitchenWarnings(
  modules: FurnitureModule[],
  roomDimensions: RoomDimensions
): SmartWarning[] {
  const warnings: SmartWarning[] = [];

  // 1. Шкаф выходит за границу стены
  modules.forEach((mod) => {
    if (mod.x < 0) {
      warnings.push({
        id: `out-left-${mod.id}`,
        type: 'error',
        title: 'Шкаф выходит за границу стены',
        message: `«${mod.name}» выступает за левую границу стены на ${Math.abs(mod.x)} мм.`,
        moduleId: mod.id
      });
    } else if (mod.x + mod.width > roomDimensions.width) {
      const over = mod.x + mod.width - roomDimensions.width;
      warnings.push({
        id: `out-right-${mod.id}`,
        type: 'error',
        title: 'Шкаф выходит за границу стены',
        message: `«${mod.name}» выступает за правую границу стены на ${over} мм.`,
        moduleId: mod.id
      });
    }

    if (mod.y + mod.height > roomDimensions.height) {
      const overY = mod.y + mod.height - roomDimensions.height;
      warnings.push({
        id: `out-top-${mod.id}`,
        type: 'error',
        title: 'Превышена высота потолка',
        message: `«${mod.name}» превышает высоту помещения на ${overY} мм.`,
        moduleId: mod.id
      });
    }
  });

  // 2. Недостаточно места для открытия фасада
  modules.forEach((mod) => {
    if (mod.facadesCount > 0 && mod.drawersCount === 0) {
      // If right next to left or right wall with 0 margin
      if (mod.x < 30) {
        warnings.push({
          id: `door-wall-${mod.id}`,
          type: 'warning',
          title: 'Ограничение открывания фасада',
          message: `«${mod.name}» установлен вплотную к стене без фальш-планки. Ручка может упираться в стену.`,
          moduleId: mod.id
        });
      }
    }
  });

  // 3. Духовка слишком близко к холодильнику
  const ovenModules = modules.filter(
    (m) => m.type.includes('oven') || m.applianceType === 'oven'
  );
  const fridgeModules = modules.filter(
    (m) => m.type.includes('fridge') || m.applianceType === 'fridge'
  );

  ovenModules.forEach((oven) => {
    fridgeModules.forEach((fridge) => {
      const distance = Math.max(0, Math.abs(oven.x - fridge.x) - Math.min(oven.width, fridge.width));
      if (distance < 150) {
        warnings.push({
          id: `oven-fridge-${oven.id}-${fridge.id}`,
          type: 'warning',
          title: 'Духовка слишком близко к холодильнику',
          message: `Тепловое излучение духового шкафа снижает ресурс холодильника. Рекомендуется зазор или термоизоляция от 150 мм.`,
          moduleId: oven.id
        });
      }
    });
  });

  // 4. Посудомоечная машина не рядом с мойкой
  const dishwasherModules = modules.filter(
    (m) => m.type.includes('dishwasher') || m.applianceType === 'dishwasher'
  );
  const sinkModules = modules.filter(
    (m) => m.type.includes('sink') || m.applianceType === 'sink'
  );

  if (dishwasherModules.length > 0 && sinkModules.length > 0) {
    dishwasherModules.forEach((dw) => {
      const nearestSinkDist = Math.min(
        ...sinkModules.map((sink) => {
          if (dw.x >= sink.x + sink.width) {
            return dw.x - (sink.x + sink.width);
          } else if (sink.x >= dw.x + dw.width) {
            return sink.x - (dw.x + dw.width);
          }
          return 0; // directly overlapping/adjacent
        })
      );

      if (nearestSinkDist > 1200) {
        warnings.push({
          id: `dw-sink-${dw.id}`,
          type: 'info',
          title: 'Посудомоечная машина далеко от мойки',
          message: `Расстояние между ПММ и точкой слива (${Math.round(nearestSinkDist)} мм) превышает стандартную длину заводского шланга. Потребуется удлинитель.`,
          moduleId: dw.id
        });
      }
    });
  }

  // 5. Верхний шкаф пересекается с вытяжкой
  const hoodModules = modules.filter(
    (m) => m.type.includes('hood') || m.applianceType === 'hood'
  );
  const wallCabinets = modules.filter(
    (m) => m.category === 'Верхние модули' || m.category === 'ВЕРХНИЕ МОДУЛИ'
  );

  hoodModules.forEach((hood) => {
    wallCabinets.forEach((cab) => {
      if (cab.id === hood.id) return;
      // Check horizontal and vertical collision
      const xOverlap = Math.max(0, Math.min(hood.x + hood.width, cab.x + cab.width) - Math.max(hood.x, cab.x));
      const yOverlap = Math.max(0, Math.min(hood.y + hood.height, cab.y + cab.height) - Math.max(hood.y, cab.y));

      if (xOverlap > 10 && yOverlap > 10) {
        warnings.push({
          id: `hood-overlap-${cab.id}`,
          type: 'error',
          title: 'Верхний шкаф пересекается с вытяжкой',
          message: `«${cab.name}» накладывается на вытяжку по габаритам (пересечение ${xOverlap}×${yOverlap} мм).`,
          moduleId: cab.id
        });
      }
    });
  });

  return warnings;
}
