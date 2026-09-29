import React, { useState } from 'react';
import { Project } from '../types/furniture';
import { calculateProjectCost } from '../utils/calculator';
import {
  Download,
  Share2,
  FileCheck,
  Check,
  Copy,
  Printer,
  Sparkles,
  Percent,
  TrendingUp,
  Receipt,
  X
} from 'lucide-react';

interface CostEstimateViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onCreateOrderFromProject: (project: Project) => void;
}

export const CostEstimateView: React.FC<CostEstimateViewProps> = ({
  project,
  onUpdateProject,
  onCreateOrderFromProject
}) => {
  const [marginPercent, setMarginPercent] = useState(project.marginPercent ?? 30);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const cost = calculateProjectCost(
    project.modules,
    marginPercent,
    project.hasCountertop ?? true
  );

  // Sync total price to project
  const handleMarginChange = (val: number) => {
    setMarginPercent(val);
    onUpdateProject({
      ...project,
      marginPercent: val,
      totalPrice: cost.clientPrice
    });
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const clientShareText = `Здравствуйте, ${project.customerName}!\n\nГотов предварительный расчет стоимости вашего проекта мебели: "${project.name}".\n\n📐 Габариты: ${project.roomDimensions.width} × ${project.roomDimensions.height} × ${project.roomDimensions.depth} мм\n📦 Количество модулей: ${project.modules.length} шт\n✨ Фурнитура: Blum / Boyard с доводчиками\n\n💰 Итоговая стоимость "под ключ": ${cost.clientPrice.toLocaleString('ru-RU')} KGS\n(Включая распил, ЧПУ-присадку, кромкование, сборку и монтаж у вас на объекте).\n\nБудем рады ответить на вопросы и согласовать дату замера/запуска в работу!`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(clientShareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="flex-1 bg-[#f8f9fa] overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e6eb] pb-6">
          <div>
            <div className="text-xs font-bold text-[#c26d45] uppercase tracking-wider">
              Финансовый расчет
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b] mt-0.5">
              Смета и себестоимость проекта
            </h1>
            <p className="text-sm text-[#71717a] mt-1">
              Проект: <span className="font-semibold text-[#18181b]">{project.name}</span> · Заказчик: {project.customerName}
            </p>
          </div>

          {/* 3 REQUIRED BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#d4d4d8] hover:border-[#18181b] rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать PDF</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#d4d4d8] hover:border-[#18181b] rounded-lg transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-[#c26d45]" />
              <span>Отправить клиенту</span>
            </button>

            <button
              onClick={() => onCreateOrderFromProject(project)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg transition-colors shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5 text-[#c26d45]" />
              <span>Создать заказ</span>
            </button>
          </div>
        </div>

        {/* TOP 5 REQUIRED STAT TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Материалы */}
          <div className="bg-white border border-[#e4e6eb] rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-[#71717a]">Материалы</div>
            <div className="text-xl font-bold text-[#18181b] font-mono tabular-nums mt-1">
              {cost.materialsCost.toLocaleString('ru-RU')} KGS
            </div>
            <div className="text-[11px] text-[#9ca3af] mt-1">ЛДСП, МДФ, кромка, столешница</div>
          </div>

          {/* 2. Фурнитура */}
          <div className="bg-white border border-[#e4e6eb] rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-[#71717a]">Фурнитура</div>
            <div className="text-xl font-bold text-[#18181b] font-mono tabular-nums mt-1">
              {cost.hardwareCost.toLocaleString('ru-RU')} KGS
            </div>
            <div className="text-[11px] text-[#9ca3af] mt-1">Петли, направляющие, ручки, крепеж</div>
          </div>

          {/* 3. Работа */}
          <div className="bg-white border border-[#e4e6eb] rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-[#71717a]">Работа</div>
            <div className="text-xl font-bold text-[#18181b] font-mono tabular-nums mt-1">
              {cost.laborCost.toLocaleString('ru-RU')} KGS
            </div>
            <div className="text-[11px] text-[#9ca3af] mt-1">Распил, ЧПУ, сборка в цехе, монтаж</div>
          </div>

          {/* 4. Себестоимость */}
          <div className="bg-[#f4f5f7] border border-[#d4d4d8] rounded-xl p-4 shadow-xs">
            <div className="text-xs font-bold text-[#374151]">Себестоимость</div>
            <div className="text-xl font-extrabold text-[#18181b] font-mono tabular-nums mt-1">
              {cost.primeCost.toLocaleString('ru-RU')} KGS
            </div>
            <div className="text-[11px] text-[#52525b] mt-1">Материалы + Фурнитура + Работа</div>
          </div>

          {/* 5. Наценка и Цена клиенту */}
          <div className="bg-[#faf3ee] border border-[#fae2d5] rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#c26d45]">Наценка: {marginPercent}%</span>
              <span className="text-[10px] text-[#8c4b2b] font-mono">
                +{(cost.clientPrice - cost.primeCost).toLocaleString('ru-RU')} KGS
              </span>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#8c4b2b] tracking-wider">
                Цена клиенту
              </div>
              <div className="text-2xl font-black text-[#18181b] font-mono tabular-nums">
                {cost.clientPrice.toLocaleString('ru-RU')} KGS
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Margin Adjuster */}
        <div className="bg-white border border-[#e4e6eb] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#faf3ee] text-[#c26d45] rounded-lg flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#18181b]">Регулировка нормы прибыли (наценки)</h4>
              <p className="text-[11px] text-[#71717a]">
                Передвигайте ползунок для расчета итоговой цены для коммерческого предложения
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={70}
              step={1}
              value={marginPercent}
              onChange={(e) => handleMarginChange(Number(e.target.value))}
              className="w-48 accent-[#c26d45] cursor-pointer"
            />
            <span className="text-sm font-bold font-mono text-[#18181b] w-12 text-right">
              {marginPercent}%
            </span>
          </div>
        </div>

        {/* ITEMIZED COST TABLE */}
        <div className="bg-white border border-[#e4e6eb] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#e4e6eb] bg-[#fafafa] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#71717a]" />
              <h3 className="font-bold text-xs text-[#18181b] uppercase tracking-wider">
                Позиционная калькуляция стоимости
              </h3>
            </div>
            <span className="text-xs text-[#71717a]">
              Всего позиций: {cost.itemized.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white border-b border-[#f0f0f2] text-[#71717a] font-semibold">
                  <th className="py-2.5 px-4">Категория</th>
                  <th className="py-2.5 px-4">Статья затрат</th>
                  <th className="py-2.5 px-4 text-center font-mono">Кол-во</th>
                  <th className="py-2.5 px-4 text-right font-mono">Цена за ед.</th>
                  <th className="py-2.5 px-4 text-right font-mono">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f2]">
                {cost.itemized.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#fafafa]">
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          item.category === 'Материалы'
                            ? 'bg-blue-50 text-blue-700'
                            : item.category === 'Фурнитура'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#18181b]">{item.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-[#52525b]">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#71717a]">
                      {item.unitPrice.toLocaleString('ru-RU')} KGS
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-[#18181b]">
                      {item.total.toLocaleString('ru-RU')} KGS
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fafafa] font-bold border-t-2 border-[#e4e6eb]">
                  <td colSpan={4} className="py-3 px-4 text-right text-[#52525b]">
                    ИТОГО СЕБЕСТОИМОСТЬ:
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#18181b]">
                    {cost.primeCost.toLocaleString('ru-RU')} KGS
                  </td>
                </tr>
                <tr className="bg-[#faf6f3] font-bold">
                  <td colSpan={4} className="py-3 px-4 text-right text-[#c26d45]">
                    ИТОГО КЛИЕНТУ С НАЦЕНКОЙ ({marginPercent}%):
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-base text-[#18181b]">
                    {cost.clientPrice.toLocaleString('ru-RU')} KGS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Share to Client Modal (WhatsApp template) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#e4e6eb] animate-in fade-in duration-200">
            <div className="px-5 py-4 border-b border-[#e4e6eb] flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#c26d45]" />
                <h3 className="font-bold text-sm text-[#18181b]">Отправить смету клиенту</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[#71717a] hover:text-[#18181b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Текст коммерческого предложения для мессенджера (WhatsApp / Telegram)
                </label>
                <textarea
                  rows={8}
                  readOnly
                  value={clientShareText}
                  className="w-full p-3 text-xs font-sans bg-[#f9fafb] border border-[#d4d4d8] rounded-lg focus:outline-none select-all"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#71717a]">
                  Получатель: {project.customerName} ({project.customerPhone})
                </span>

                <button
                  onClick={handleCopyShare}
                  className="px-4 py-2 text-xs font-semibold bg-[#18181b] hover:bg-[#27272a] text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Скопировано в буфер!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Скопировать текст</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
