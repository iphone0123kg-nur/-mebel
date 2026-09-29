export type ProjectStatus = 'Черновик' | 'На согласовании' | 'В производстве' | 'Готово';

export type FurnitureType =
  | 'Кухня'
  | 'Шкаф'
  | 'Гардеробная'
  | 'Тумба'
  | 'Комод'
  | 'ТВ-зона'
  | 'Прихожая'
  | 'Стеллаж'
  | 'Рабочий стол';

export type KitchenType = 'Прямая' | 'Г-образная' | 'П-образная' | 'С островом';

export interface RoomDimensions {
  width: number; // in mm, e.g. 4200
  height: number; // in mm, e.g. 2800
  depth: number; // in mm, e.g. 2400
}

export type ModuleCategory =
  | 'НИЖНИЕ МОДУЛИ'
  | 'ВЕРХНИЕ МОДУЛИ'
  | 'ПЕНАЛЫ'
  | 'ТЕХНИКА'
  | 'Нижние модули'
  | 'Верхние модули'
  | 'Пеналы'
  | 'Техника'
  | 'Угловые модули'
  | 'Модули под мойку'
  | 'Модули под духовку'
  | 'Модули под посудомойку'
  | 'Холодильник'
  | 'Однодверный'
  | 'Двухдверный'
  | 'Трехдверный'
  | 'Полки'
  | 'Ящики'
  | 'Штанги'
  | 'Антресоль';

export interface CountertopConfig {
  enabled: boolean;
  thickness: number; // 20, 38, 60, 12 mm
  depth: number; // 600, 650, 800 mm
  material: string; // 'ДСП влагостойкая HPL', 'Компакт-плита 12 мм', 'Кварцевый агломерат', 'Искусственный камень'
  color: string; // 'Графит матовый', 'Белый мрамор Калакатта', 'Дуб Вотан', 'Бетон серый', 'Черный монолит'
  colorHex: string;
  edgeProfile: string; // 'Прямой с фаской', 'Радиусный R3', 'Постформинг', 'Еврозапил'
}

export interface PlinthConfig {
  enabled: boolean;
  height: number; // 100, 120, 150 mm
  material: string; // 'Пластик с силиконовым уплотнителем', 'МДФ в цвет фасада', 'Алюминиевый профиль'
  color: string; // 'Черный матовый', 'Белый матовый', 'Алюминий брашированный', 'Кашемир'
  colorHex: string;
}

export interface BacksplashConfig {
  enabled: boolean;
  type: 'плитка' | 'стекло' | 'камень' | 'панель';
  materialName: string;
  colorHex: string;
  height: number; // mm (default 600)
}

export interface SmartWarning {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  moduleId?: string;
}

export type OpeningType =
  | 'распашной'
  | 'подъемный'
  | 'откидной'
  | 'выдвижной'
  | 'раздвижной';

export type HingeSide = 'left' | 'right' | 'top' | 'bottom';

export interface InteractivePartState {
  id: string; // e.g. `${moduleId}-door-left`
  moduleId: string;
  name: string;
  type: 'door' | 'drawer' | 'shelf' | 'handle';
  openingType: OpeningType;
  hingeSide?: HingeSide;
  maxAngle?: number; // degrees (e.g. 110)
  maxSlide?: number; // mm (e.g. 450)
  isOpen: boolean;
  openProgress: number; // 0.0 (closed) to 1.0 (fully open)
  runnerType?: string;
  collisionWarning?: string | null;
}

export interface FurnitureModule {
  id: string;
  name: string;
  category: ModuleCategory;
  type: string; // e.g., 'base_standard', 'base_sink', 'wall_standard', etc.
  x: number; // in mm from room left
  y: number; // in mm from floor (0 for base cabinets, 1420 for wall cabinets)
  z: number; // depth offset from back wall
  width: number; // mm
  height: number; // mm
  depth: number; // mm
  shelvesCount: number;
  facadesCount: number; // 0, 1, 2, or drawer fronts
  drawersCount: number;
  carcassMaterial: string;
  carcassThickness?: number; // 16, 18, 22 mm
  facadeMaterial: string;
  facadeThickness?: number; // 16, 19, 22 mm
  facadeColor: string; // hex or name
  facadeColorHex: string;
  facadeTexture?: string; // 'Матовая' | 'Глянец' | 'Шагрень' | 'Древесная' | 'Шелк'
  backWallMaterial: string;
  handleType: string;
  hingeType: string;
  runnerType: string;
  isLocked?: boolean;
  doorsOpen?: boolean;
  isAppliance?: boolean;
  applianceType?: 'cooktop' | 'sink' | 'oven' | 'fridge' | 'dishwasher' | 'microwave' | 'hood';
  glassFront?: boolean;
  cutoutType?: 'sink' | 'cooktop' | 'none';
  rotation?: number; // 0, 90, 180, 270 degrees
  wallAttachment?: 'back' | 'left' | 'right' | 'island';
  partsState?: Record<string, { isOpen: boolean; openProgress?: number; openingType?: OpeningType; hingeSide?: HingeSide; maxAngle?: number; maxSlide?: number; runnerType?: string }>;
}

export interface MaterialItem {
  id: string;
  category: 'Корпус' | 'Фасады' | 'Столешницы' | 'Фурнитура';
  subCategory: string;
  name: string;
  thickness: string;
  price: number;
  unit: string;
  supplier: string;
  colorHex?: string;
  texture?: string;
  description?: string;
}

export interface PartDetail {
  id: string;
  moduleId: string;
  moduleName: string;
  name: string;
  length: number; // mm
  width: number; // mm
  count: number;
  material: string;
  edge04: string; // which sides
  edge20: string; // which sides
}

export interface Project {
  id: string;
  name: string;
  customerName: string;
  customerPhone: string;
  furnitureType: FurnitureType;
  kitchenType?: KitchenType;
  roomDimensions: RoomDimensions;
  status: ProjectStatus;
  date: string;
  totalPrice: number;
  image: string;
  modules: FurnitureModule[];
  hasCountertop?: boolean;
  hasPlinth?: boolean;
  countertopConfig?: CountertopConfig;
  plinthConfig?: PlinthConfig;
  backsplashConfig?: BacksplashConfig;
  marginPercent?: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  projectId: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  furnitureType: FurnitureType;
  status: 'Новые' | 'Закупка' | 'Распил' | 'Сборка' | 'Монтаж' | 'Готово';
  totalPrice: number;
  advancePaid: number;
  deadlineDate: string;
  createdAt: string;
  responsibleMaster: string;
  address: string;
}
