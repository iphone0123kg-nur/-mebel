import React from 'react';
import { Project } from '../types/furniture';
import { 
  FolderKanban, 
  Layers, 
  Box, 
  Palette, 
  FileSpreadsheet, 
  Calculator, 
  Truck, 
  Plus, 
  ChevronDown 
} from 'lucide-react';

export type ActiveTab = 'projects' | 'constructor' | '3d' | 'materials' | 'detailing' | 'estimate' | 'orders';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentProject: Project;
  allProjects: Project[];
  onSelectProject: (proj: Project) => void;
  onOpenNewProjectModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  currentProject,
  allProjects,
  onSelectProject,
  onOpenNewProjectModal
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'projects', label: 'ПРОЕКТЫ', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'constructor', label: 'КОНСТРУКТОР', icon: <Layers className="w-4 h-4" /> },
    { id: '3d', label: '3D', icon: <Box className="w-4 h-4" /> },
    { id: 'materials', label: 'МАТЕРИАЛЫ', icon: <Palette className="w-4 h-4" /> },
    { id: 'detailing', label: 'ДЕТАЛИРОВКА', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'estimate', label: 'СМЕТА', icon: <Calculator className="w-4 h-4" /> },
    { id: 'orders', label: 'ЗАКАЗЫ', icon: <Truck className="w-4 h-4" /> }
  ];

  return (
    <header className="h-14 border-b border-[#e2e4e8] bg-white px-5 flex items-center justify-between shrink-0 select-none z-30 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Zone 1: Wordmark Brand */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={() => setActiveTab('projects')}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-7 h-7 bg-[#18181b] text-white flex items-center justify-center rounded font-mono font-bold text-xs tracking-wider">
            МК
          </div>
          <span className="font-bold text-sm tracking-tight text-[#18181b]">
            МЕБЕЛЬКОНСТРУКТОР <span className="text-[#c26d45] font-extrabold text-xs">PRO</span>
          </span>
        </button>

        {/* Project Selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#f4f5f7] hover:bg-[#eaecee] border border-[#e4e6eb] rounded text-[#333] transition-colors"
          >
            <span className="max-w-[140px] truncate font-medium">{currentProject.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717a]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-[#e4e6eb] rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8e8e93] border-b border-[#f0f0f2]">
                ТЕКУЩИЕ ПРОЕКТЫ
              </div>
              <div className="max-h-60 overflow-y-auto">
                {allProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-[#f5f6f8] flex items-center justify-between transition-colors ${
                      p.id === currentProject.id ? 'bg-[#faf6f3] text-[#c26d45] font-semibold' : 'text-[#27272a]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-[#71717a] shrink-0 font-mono">
                      {p.furnitureType}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation Links (7 Required Sections) */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#18181b] text-white shadow-xs'
                  : 'text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-1.5 bg-[#c26d45] hover:bg-[#ab5d37] text-white px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Новый проект</span>
        </button>
      </div>
    </header>
  );
};
