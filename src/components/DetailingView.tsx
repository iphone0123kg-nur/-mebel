import React, { useState } from 'react';
import { Project } from '../types/furniture';
import {
  calculateProjectDetailing,
  generateSheetNesting,
  calculateModuleParts
} from '../utils/calculator';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Layers,
  ChevronDown,
  ChevronRight,
  Maximize,
  Package,
  Wrench,
  CheckCircle2
} from 'lucide-react';

interface DetailingViewProps {
  project: Project;
}

export const DetailingView: React.FC<DetailingViewProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<'parts' | 'nesting'>('parts');
  const [selectedSheetNumber, setSelectedSheetNumber] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    project.modules.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );

  const detailing = calculateProjectDetailing(project.modules);
  const nesting = generateSheetNesting(detailing.partsList);

  const toggleExpand = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Модуль', 'Деталь', 'Длина (мм)', 'Ширина (мм)', 'Кол-во', 'Материал', 'Кромка 0.4', 'Кромка 2.0'];
    const rows = detailing.partsList.map((p) => [
      `"${p.moduleName}"`,
      `"${p.name}"`,
      p.length,
      p.width,
      p.count,
      `"${p.material}"`,
      `"${p.edge04}"`,
      `"${p.edge20}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Деталировка_${project.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSheet = nesting.sheets.find((s) => s.sheetNumber === selectedSheetNumber) || nesting.sheets[0];

  return (
    <div className="flex-1 bg-[#f8f9fa] overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e6eb] pb-6">
          <div>
            <div className="text-xs font-bold text-[#c26d45] uppercase tracking-wider">
              Производственная документация
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b] mt-0.5">
              Деталировка и карты раскроя
            </h1>
            <p className="text-sm text-[#71717a] mt-1">
              Проект: <span className="font-semibold text-[#18181b]">{project.name}</span> ({project.customerName}) · {project.modules.length} модулей
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#d4d4d8] hover:border-[#18181b] rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать карт</span>
            </button>
          </div>
        </div>

        {/* SUMMARY STATS TILES (Exactly matching prompt requirements) */}
        <div className="bg-white border border-[#e4e6eb] rounded-xl p-5 shadow-xs">
          <div className="text-xs font-bold text-[#18181b] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#c26d45]" />
            <span>Сводные показатели расхода материалов и фурнитуры</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">ЛДСП (2800×2070)</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.ldspSheets} <span className="text-xs font-normal">листа</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">{detailing.ldspSquareMeters} м² деталей</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">МДФ фасады</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.mdfSquareMeters} <span className="text-xs font-normal">м²</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">Эмаль / Soft-touch</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">Кромка 0.4 мм</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.edge04Meters} <span className="text-xs font-normal">м</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">Невидимые грани</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">Кромка 2 мм</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.edge20Meters} <span className="text-xs font-normal">м</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">Лицевые торцы</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">Петли</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.hingesCount} <span className="text-xs font-normal">шт</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">С доводчиком</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">Направляющие</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.runnersCount} <span className="text-xs font-normal">компл.</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">Ящики скрытые</div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#eef0f2]">
              <div className="text-[11px] text-[#71717a]">Ручки</div>
              <div className="text-lg font-bold text-[#18181b] font-mono tabular-nums mt-0.5">
                {detailing.handlesCount} <span className="text-xs font-normal">шт</span>
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">Точки открывания</div>
            </div>
          </div>
        </div>

        {/* View Switcher: Parts Table vs Interactive Sheet Nesting */}
        <div className="flex items-center gap-2 border-b border-[#e4e6eb] pb-2">
          <button
            onClick={() => setActiveTab('parts')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'parts'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Помодульная деталировка деталей</span>
          </button>

          <button
            onClick={() => setActiveTab('nesting')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'nesting'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Карта раскроя плит ЛДСП</span>
          </button>
        </div>

        {/* TAB 1: MODULE-BY-MODULE PARTS TABLE */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            {project.modules.map((mod, idx) => {
              const parts = calculateModuleParts(mod, idx);
              const isExpanded = expandedModules[mod.id] ?? true;

              return (
                <div
                  key={mod.id}
                  className="bg-white border border-[#e4e6eb] rounded-xl overflow-hidden shadow-xs"
                >
                  {/* Module Accordion Header */}
                  <div
                    onClick={() => toggleExpand(mod.id)}
                    className="p-4 bg-[#fafafa] hover:bg-[#f5f5f7] border-b border-[#e4e6eb] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#71717a]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#71717a]" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#18181b]">
                            Шкаф №{idx + 1} — {mod.name}
                          </span>
                          <span className="text-[11px] font-mono bg-[#f4f4f5] px-2 py-0.5 rounded text-[#52525b]">
                            {mod.width} × {mod.height} × {mod.depth} мм
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71717a] mt-0.5">
                          Корпус: {mod.carcassMaterial} · Фасад: {mod.facadeColor} ({mod.facadeMaterial})
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-mono font-bold text-[#18181b]">
                      {parts.reduce((sum, p) => sum + p.count, 0)} деталей
                    </div>
                  </div>

                  {/* Parts List */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-white border-b border-[#f0f0f2] text-[#71717a] font-semibold">
                            <th className="py-2.5 px-4">Наименование детали</th>
                            <th className="py-2.5 px-4 font-mono">Размер (мм)</th>
                            <th className="py-2.5 px-4 text-center font-mono">Кол-во</th>
                            <th className="py-2.5 px-4">Материал</th>
                            <th className="py-2.5 px-4">Кромка 0.4 мм</th>
                            <th className="py-2.5 px-4">Кромка 2.0 мм</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f0f2]">
                          {parts.map((part) => (
                            <tr key={part.id} className="hover:bg-[#fafafa]">
                              <td className="py-2.5 px-4 font-semibold text-[#18181b]">
                                {part.name}
                              </td>
                              <td className="py-2.5 px-4 font-mono tabular-nums text-[#374151]">
                                {part.length} × {part.width}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-[#18181b]">
                                {part.count} шт
                              </td>
                              <td className="py-2.5 px-4 text-[#52525b]">{part.material}</td>
                              <td className="py-2.5 px-4 font-mono text-[#71717a]">{part.edge04}</td>
                              <td className="py-2.5 px-4 font-mono text-[#c26d45] font-medium">
                                {part.edge20}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: INTERACTIVE SHEET NESTING (РАСКРОЙ ЛИСТОВ) */}
        {activeTab === 'nesting' && (
          <div className="bg-white border border-[#e4e6eb] rounded-xl p-6 shadow-xs space-y-5">
            {/* Sheet selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0f2] pb-4">
              <div>
                <h3 className="font-bold text-sm text-[#18181b]">
                  Раскрой плиты ЛДСП 2800 × 2070 мм (Толщина 18 мм)
                </h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  Оптимальное размещение заготовок для форматно-раскроечного станка с учетом направления волокон
                </p>
              </div>

              {/* Sheet tabs */}
              <div className="flex items-center gap-1.5">
                {nesting.sheets.map((s) => (
                  <button
                    key={s.sheetNumber}
                    onClick={() => setSelectedSheetNumber(s.sheetNumber)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      selectedSheetNumber === s.sheetNumber
                        ? 'bg-[#18181b] text-white shadow-xs'
                        : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#eaeaea]'
                    }`}
                  >
                    Лист №{s.sheetNumber} ({s.usedAreaPercent}% KИМ)
                  </button>
                ))}
              </div>
            </div>

            {/* Sheet Canvas representation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#71717a]">
                <span>
                  Лист №{currentSheet.sheetNumber} · Коэффициент использования материала (КИМ):{' '}
                  <strong className="text-emerald-700">{currentSheet.usedAreaPercent}%</strong>
                </span>
                <span className="font-mono">Ширина: 2800 мм · Высота: 2070 мм</span>
              </div>

              <div className="relative w-full aspect-28/20 max-h-[500px] bg-[#f8fafc] border-2 border-[#94a3b8] rounded-lg overflow-hidden shadow-inner p-1">
                {/* Visual cutting items */}
                {currentSheet.rects.map((rect, rIdx) => {
                  const leftPercent = (rect.x / nesting.sheetWidth) * 100;
                  const topPercent = (rect.y / nesting.sheetHeight) * 100;
                  const widthPercent = (rect.width / nesting.sheetWidth) * 100;
                  const heightPercent = (rect.height / nesting.sheetHeight) * 100;

                  return (
                    <div
                      key={rIdx}
                      className="absolute border border-black/30 rounded-2xs flex flex-col items-center justify-center p-1 overflow-hidden transition-transform hover:scale-102 hover:z-20 cursor-default shadow-2xs"
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                        backgroundColor: rect.color
                      }}
                      title={`${rect.moduleName}: ${rect.label}`}
                    >
                      <span className="text-[10px] font-bold text-[#1e293b] truncate w-full text-center">
                        {rect.label}
                      </span>
                      <span className="text-[9px] text-[#475569] truncate w-full text-center opacity-80">
                        {rect.moduleName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-[#71717a]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#bfdbfe] border border-black/20 rounded-2xs" />
                  <span>Боковины корпусов</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#fed7aa] border border-black/20 rounded-2xs" />
                  <span>Дно и полки</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#bbf7d0] border border-black/20 rounded-2xs" />
                  <span>Крышки и царги</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#f8fafc] border border-dashed border-[#94a3b8] rounded-2xs" />
                  <span>Деловой остаток (обрезки)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
