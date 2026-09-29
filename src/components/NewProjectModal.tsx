import React, { useState } from 'react';
import { FurnitureType, KitchenType, Project } from '../types/furniture';
import { X, Sparkles, Ruler } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Project) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+996 ');
  const [projectName, setProjectName] = useState('');
  const [furnitureType, setFurnitureType] = useState<FurnitureType>('Кухня');
  const [kitchenType, setKitchenType] = useState<KitchenType>('Прямая');
  const [roomWidth, setRoomWidth] = useState(4200);
  const [roomHeight, setRoomHeight] = useState(2800);
  const [roomDepth, setRoomDepth] = useState(2400);

  if (!isOpen) return null;

  const furnitureTypes: FurnitureType[] = [
    'Кухня',
    'Шкаф',
    'Гардеробная',
    'Тумба',
    'Комод',
    'ТВ-зона',
    'Прихожая',
    'Стеллаж',
    'Рабочий стол'
  ];

  const kitchenTypes: KitchenType[] = ['Прямая', 'Г-образная', 'П-образная', 'С островом'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const title = projectName.trim() || `${furnitureType} — ${customerName.trim() || 'Клиент'}`;
    const newProjId = 'proj-' + Date.now();

    const newProject: Project = {
      id: newProjId,
      name: title,
      customerName: customerName.trim() || 'Новый клиент',
      customerPhone: customerPhone.trim() || '+996 555 00-00-00',
      furnitureType,
      kitchenType: furnitureType === 'Кухня' ? kitchenType : undefined,
      roomDimensions: {
        width: Number(roomWidth) || 4200,
        height: Number(roomHeight) || 2800,
        depth: Number(roomDepth) || 2400
      },
      status: 'Черновик',
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      totalPrice: 0,
      image: '',
      modules: [],
      hasCountertop: furnitureType === 'Кухня',
      hasPlinth: true,
      countertopConfig: {
        enabled: furnitureType === 'Кухня',
        thickness: 38,
        depth: 600,
        material: 'ДСП влагостойкая HPL Slotex',
        color: 'Графит матовый',
        colorHex: '#27272a',
        edgeProfile: 'Прямой с фаской'
      },
      plinthConfig: {
        enabled: true,
        height: 100,
        material: 'Пластик с силиконовым уплотнителем',
        color: 'Черный матовый',
        colorHex: '#18181b'
      },
      backsplashConfig: {
        enabled: furnitureType === 'Кухня',
        type: 'плитка',
        materialName: 'Керамогранит крупноформатный',
        colorHex: '#e5e7eb',
        height: 600
      },
      marginPercent: 30,
      notes: ''
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#e4e6eb] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e4e6eb] flex items-center justify-between bg-[#fafafa]">
          <div>
            <h2 className="text-lg font-bold text-[#18181b]">Новый проект мебели</h2>
            <p className="text-xs text-[#71717a]">
              Заполните параметры помещения и клиента для запуска конструктора
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-[#eaebee] rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Имя клиента <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="например: Айбек Садыков"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Телефон</label>
              <input
                type="text"
                placeholder="+996 555 12-34-56"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
              />
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Название проекта</label>
            <input
              type="text"
              placeholder="например: Кухня в ЖК 'Империал' (если пусто — сформируется автоматически)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
            />
          </div>

          {/* Furniture Type Chips */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-2">
              Тип мебели
            </label>
            <div className="grid grid-cols-3 gap-2">
              {furnitureTypes.map((type) => {
                const isSelected = furnitureType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFurnitureType(type)}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                        : 'bg-white text-[#52525b] border-[#e4e6eb] hover:border-[#b4b7bd]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* For Kitchen: Kitchen Type */}
          {furnitureType === 'Кухня' && (
            <div className="p-3 bg-[#faf6f3] border border-[#fae8dc] rounded-lg">
              <label className="block text-xs font-semibold text-[#c26d45] mb-2">
                Тип кухни
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {kitchenTypes.map((kType) => {
                  const isSelected = kitchenType === kType;
                  return (
                    <button
                      key={kType}
                      type="button"
                      onClick={() => setKitchenType(kType)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-all ${
                        isSelected
                          ? 'bg-[#c26d45] text-white border-[#c26d45]'
                          : 'bg-white text-[#4b5563] border-[#e4e6eb] hover:border-[#c26d45]'
                      }`}
                    >
                      {kType}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room Dimensions */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] mb-2">
              <Ruler className="w-3.5 h-3.5 text-[#71717a]" />
              <span>Габариты помещения / ниши (в миллиметрах)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#71717a] mb-0.5">Ширина (мм)</label>
                <input
                  type="number"
                  min={800}
                  max={12000}
                  step={50}
                  value={roomWidth}
                  onChange={(e) => setRoomWidth(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg font-mono focus:outline-none focus:border-[#18181b]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#71717a] mb-0.5">Высота (мм)</label>
                <input
                  type="number"
                  min={1200}
                  max={4500}
                  step={50}
                  value={roomHeight}
                  onChange={(e) => setRoomHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg font-mono focus:outline-none focus:border-[#18181b]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#71717a] mb-0.5">Глубина (мм)</label>
                <input
                  type="number"
                  min={300}
                  max={6000}
                  step={50}
                  value={roomDepth}
                  onChange={(e) => setRoomDepth(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg font-mono focus:outline-none focus:border-[#18181b]"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#e4e6eb] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c26d45]" />
              <span>Создать проект</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
