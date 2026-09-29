import React, { useState } from 'react';
import { Project, ProjectStatus } from '../types/furniture';
import { 
  Plus, 
  Search, 
  Layers, 
  Box, 
  Calculator, 
  Trash2, 
  Calendar, 
  User, 
  Maximize2 
} from 'lucide-react';

interface ProjectsDashboardProps {
  projects: Project[];
  onSelectProject: (project: Project, tab?: 'constructor' | '3d' | 'estimate') => void;
  onOpenNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Все' | ProjectStatus>('Все');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.furnitureType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Все' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'Готово':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'В производстве':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'На согласовании':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Черновик':
      default:
        return 'text-zinc-600 bg-zinc-100 border-zinc-200';
    }
  };

  return (
    <div className="flex-1 bg-[#f8f9fa] overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e6eb] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b]">Мои проекты</h1>
            <p className="text-sm text-[#71717a] mt-1">
              Управление проектами корпусной мебели, статус производства и сметы
            </p>
          </div>

          <button
            onClick={onOpenNewProject}
            className="inline-flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] text-white px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Новый проект</span>
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#eaebee] rounded-lg overflow-x-auto">
            {(['Все', 'Черновик', 'На согласовании', 'В производстве', 'Готово'] as const).map(
              (st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#18181b] shadow-xs'
                        : 'text-[#64748b] hover:text-[#18181b]'
                    }`}
                  >
                    {st}
                  </button>
                );
              }
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Поиск по проекту, клиенту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b] transition-colors"
            />
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-[#d4d4d8] rounded-xl">
            <p className="text-sm font-medium text-[#71717a]">Проекты не найдены</p>
            <button
              onClick={onOpenNewProject}
              className="mt-3 text-xs font-semibold text-[#c26d45] hover:underline"
            >
              Создать первый проект
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map((project) => {
              const dims = `${project.roomDimensions.width} × ${project.roomDimensions.height} × ${project.roomDimensions.depth} мм`;
              return (
                <div
                  key={project.id}
                  className="group bg-white border border-[#e4e6eb] hover:border-[#b4b7bd] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  {/* Preview Image with fallback */}
                  <div
                    onClick={() => onSelectProject(project, 'constructor')}
                    className="relative aspect-4/3 bg-[#f0f0f2] overflow-hidden cursor-pointer"
                  >
                    {project.image ? (
                      <img
                        src={project.image}
                        alt={project.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#9ca3af] p-4 text-center">
                        <Box className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">3D схема проекта</span>
                      </div>
                    )}

                    {/* Status badge in corner */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-mono">
                      {project.furnitureType} {project.kitchenType ? `(${project.kitchenType})` : ''}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        onClick={() => onSelectProject(project, 'constructor')}
                        className="font-bold text-base text-[#18181b] hover:text-[#c26d45] cursor-pointer transition-colors truncate"
                      >
                        {project.name}
                      </h3>

                      {/* Clean unboxed metadata with separators */}
                      <div className="flex items-center gap-1.5 text-xs text-[#71717a] mt-1">
                        <User className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                        <span className="truncate">{project.customerName}</span>
                        <span aria-hidden="true">·</span>
                        <Calendar className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                        <span className="shrink-0">{project.date}</span>
                      </div>

                      {/* Dimensions info */}
                      <div className="flex items-center gap-1.5 text-xs text-[#52525b] mt-2 font-mono">
                        <Maximize2 className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                        <span>Габариты: {dims}</span>
                      </div>

                      {/* Modules count */}
                      <div className="text-[11px] text-[#71717a] mt-1">
                        Модулей в проекте: <span className="font-semibold text-[#18181b]">{project.modules.length} шт</span>
                      </div>
                    </div>

                    {/* Price and actions bar */}
                    <div className="pt-3 border-t border-[#f0f0f2] flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-[#71717a] uppercase font-semibold">Итого сметы</div>
                        <div className="text-base font-bold text-[#18181b] font-mono tabular-nums">
                          {project.totalPrice.toLocaleString('ru-RU')} KGS
                        </div>
                      </div>

                      {/* Quick tool launch buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onSelectProject(project, 'constructor')}
                          title="Открыть конструктор"
                          className="p-1.5 text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded transition-colors"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectProject(project, '3d')}
                          title="Открыть 3D"
                          className="p-1.5 text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded transition-colors"
                        >
                          <Box className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectProject(project, 'estimate')}
                          title="Смета"
                          className="p-1.5 text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded transition-colors"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Удалить проект "${project.name}"?`)) {
                              onDeleteProject(project.id);
                            }
                          }}
                          title="Удалить"
                          className="p-1.5 text-[#71717a] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
