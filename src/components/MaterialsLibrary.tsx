import React, { useState } from 'react';
import { MaterialItem, Project } from '../types/furniture';
import { INITIAL_MATERIALS } from '../data/initialData';
import { Search, Plus, Check, Sparkles, Filter, X } from 'lucide-react';

interface MaterialsLibraryProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

export const MaterialsLibrary: React.FC<MaterialsLibraryProps> = ({
  project,
  onUpdateProject
}) => {
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [activeCategory, setActiveCategory] = useState<'Корпус' | 'Фасады' | 'Столешницы' | 'Фурнитура'>('Корпус');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  // Modal for adding custom material
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<'Корпус' | 'Фасады' | 'Столешницы' | 'Фурнитура'>('Корпус');
  const [newMatSubCategory, setNewMatSubCategory] = useState('ЛДСП');
  const [newMatThickness, setNewMatThickness] = useState('18 мм');
  const [newMatPrice, setNewMatPrice] = useState(3200);
  const [newMatUnit, setNewMatUnit] = useState('лист (2800×2070)');
  const [newMatSupplier, setNewMatSupplier] = useState('');
  const [newMatColorHex, setNewMatColorHex] = useState('#d8cebf');

  const categories: ('Корпус' | 'Фасады' | 'Столешницы' | 'Фурнитура')[] = [
    'Корпус',
    'Фасады',
    'Столешницы',
    'Фурнитура'
  ];

  const subCategoriesByCategory: Record<'Корпус' | 'Фасады' | 'Столешницы' | 'Фурнитура', string[]> = {
    'Корпус': ['Все', 'ЛДСП', 'МДФ', 'Фанера', 'Массив'],
    'Фасады': ['Все', 'МДФ краска', 'МДФ пленка', 'Акрил', 'Пластик', 'Шпон', 'ЛДСП'],
    'Столешницы': ['Все', 'ДСП', 'Компакт', 'Кварц', 'Гранит', 'Искусственный камень'],
    'Фурнитура': ['Все', 'Петли', 'Направляющие', 'Ручки', 'Подъемники', 'Ножки', 'Крепеж']
  };

  const filteredMaterials = materials.filter((m) => {
    if (m.category !== activeCategory) return false;
    if (activeSubCategory !== 'Все' && m.subCategory !== activeSubCategory) return false;
    if (
      searchQuery.trim() &&
      !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.supplier.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Apply material to all modules in current project
  const handleApplyToProject = (mat: MaterialItem) => {
    let updatedModules = [...project.modules];

    if (mat.category === 'Корпус') {
      updatedModules = updatedModules.map((m) => ({
        ...m,
        carcassMaterial: mat.name
      }));
    } else if (mat.category === 'Фасады') {
      updatedModules = updatedModules.map((m) => ({
        ...m,
        facadeMaterial: mat.name,
        facadeColorHex: mat.colorHex || m.facadeColorHex,
        facadeColor: mat.name
      }));
    }

    onUpdateProject({
      ...project,
      modules: updatedModules
    });

    setAppliedToast(`Материал "${mat.name}" применен ко всем модулям проекта`);
    setTimeout(() => setAppliedToast(null), 3000);
  };

  // Add custom material submit
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const created: MaterialItem = {
      id: 'mat-custom-' + Date.now(),
      category: newMatCategory,
      subCategory: newMatSubCategory,
      name: newMatName,
      thickness: newMatThickness,
      price: Number(newMatPrice) || 1000,
      unit: newMatUnit,
      supplier: newMatSupplier || 'Собственный склад',
      colorHex: newMatColorHex,
      description: 'Пользовательский материал'
    };

    setMaterials([created, ...materials]);
    setIsAddModalOpen(false);
    setNewMatName('');
  };

  return (
    <div className="flex-1 bg-[#f8f9fa] overflow-y-auto p-6 md:p-8">
      {/* Toast Feedback */}
      {appliedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181b] text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-zinc-700 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{appliedToast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e6eb] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b]">
              База материалов и фурнитуры
            </h1>
            <p className="text-sm text-[#71717a] mt-1">
              Каталог плитных материалов (Egger, Kronospan), мебельных фасадов, столешниц и фурнитуры Blum / Boyard
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] text-white px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Добавить материал</span>
          </button>
        </div>

        {/* 4 Main Category Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e4e6eb] pb-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveSubCategory('Все');
                }}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#18181b] text-white shadow-xs'
                    : 'text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Subcategories and Search filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Subcategory buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {subCategoriesByCategory[activeCategory].map((sub) => {
              const isSelected = activeSubCategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubCategory(sub)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-[#c26d45] text-white'
                      : 'bg-white text-[#52525b] border border-[#e4e6eb] hover:border-[#b4b7bd]'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder={`Поиск в "${activeCategory}"...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
            />
          </div>
        </div>

        {/* Materials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white border border-[#e4e6eb] hover:border-[#c26d45]/40 rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Thumbnail / Swatch preview */}
                <div className="h-28 rounded-lg mb-3 border border-[#e4e6eb] overflow-hidden relative flex items-center justify-center bg-[#fafafa]">
                  {mat.colorHex ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: mat.colorHex,
                        backgroundImage: mat.subCategory.includes('Дуб') || mat.subCategory.includes('Орех') || mat.subCategory.includes('Массив')
                          ? `repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 8px)`
                          : undefined
                      }}
                    />
                  ) : (
                    <div className="text-center p-3 text-[#71717a]">
                      <span className="text-xs font-semibold">{mat.subCategory}</span>
                    </div>
                  )}

                  {/* SubCategory tag */}
                  <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[#18181b] text-[10px] font-semibold px-2 py-0.5 rounded shadow-2xs">
                    {mat.subCategory}
                  </span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-sm text-[#18181b] group-hover:text-[#c26d45] transition-colors leading-snug">
                  {mat.name}
                </h3>

                {/* Specs: Thickness & Supplier */}
                <div className="flex items-center gap-2 text-xs text-[#71717a] mt-2">
                  <span className="font-mono font-medium">Толщина: {mat.thickness}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{mat.supplier}</span>
                </div>

                {mat.description && (
                  <p className="text-[11px] text-[#9ca3af] mt-2 line-clamp-2">
                    {mat.description}
                  </p>
                )}
              </div>

              {/* Price & Apply button */}
              <div className="pt-3 border-t border-[#f0f0f2] mt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#71717a] uppercase font-semibold">Цена</div>
                  <div className="text-sm font-bold text-[#18181b] font-mono tabular-nums">
                    {mat.price.toLocaleString('ru-RU')} KGS
                    <span className="text-[10px] font-normal text-[#71717a] ml-1">/{mat.unit}</span>
                  </div>
                </div>

                {(mat.category === 'Корпус' || mat.category === 'Фасады') && (
                  <button
                    onClick={() => handleApplyToProject(mat)}
                    title="Применить ко всем модулям"
                    className="px-2.5 py-1.5 text-xs font-semibold bg-[#faf3ee] text-[#c26d45] hover:bg-[#f6eae2] rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Применить</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e4e6eb] animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-[#e4e6eb] flex items-center justify-between bg-[#fafafa]">
              <h3 className="font-bold text-sm text-[#18181b]">Добавить новый материал</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#71717a] hover:text-[#18181b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Название материала <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: ЛДСП Egger Антрацит U963"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Категория
                  </label>
                  <select
                    value={newMatCategory}
                    onChange={(e) => setNewMatCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Толщина
                  </label>
                  <input
                    type="text"
                    value={newMatThickness}
                    onChange={(e) => setNewMatThickness(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Цена (KGS)
                  </label>
                  <input
                    type="number"
                    value={newMatPrice}
                    onChange={(e) => setNewMatPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg font-mono focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Единица измерения
                  </label>
                  <input
                    type="text"
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Поставщик
                  </label>
                  <input
                    type="text"
                    placeholder="Egger / Blum / Склад"
                    value={newMatSupplier}
                    onChange={(e) => setNewMatSupplier(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Цвет образца
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newMatColorHex}
                      onChange={(e) => setNewMatColorHex(e.target.value)}
                      className="w-8 h-8 rounded border border-[#d4d4d8] cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[#71717a]">{newMatColorHex}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#e4e6eb] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#18181b] text-white rounded-lg hover:bg-[#27272a]"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
