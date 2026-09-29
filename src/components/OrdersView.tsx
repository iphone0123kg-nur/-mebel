import React, { useState } from 'react';
import { OrderItem, Project } from '../types/furniture';
import { INITIAL_ORDERS } from '../data/initialData';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  User,
  Phone,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface OrdersViewProps {
  orders: OrderItem[];
  projects: Project[];
  onSelectProjectById: (projectId: string) => void;
  onUpdateOrders: (orders: OrderItem[]) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  projects,
  onSelectProjectById,
  onUpdateOrders
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Все');

  const columns: { id: OrderItem['status']; label: string; color: string }[] = [
    { id: 'Новые', label: 'Новые заказы', color: 'border-zinc-400' },
    { id: 'Закупка', label: 'Закупка материалов', color: 'border-blue-400' },
    { id: 'Распил', label: 'Распил и кромка', color: 'border-amber-400' },
    { id: 'Сборка', label: 'Присадка и сборка', color: 'border-purple-400' },
    { id: 'Монтаж', label: 'Монтаж у клиента', color: 'border-orange-400' },
    { id: 'Готово', label: 'Завершенные', color: 'border-emerald-500' }
  ];

  const handleAdvanceStatus = (orderId: string) => {
    const statusOrder: OrderItem['status'][] = ['Новые', 'Закупка', 'Распил', 'Сборка', 'Монтаж', 'Готово'];
    const updated = orders.map((o) => {
      if (o.id !== orderId) return o;
      const curIdx = statusOrder.indexOf(o.status);
      const nextIdx = Math.min(statusOrder.length - 1, curIdx + 1);
      return { ...o, status: statusOrder[nextIdx] };
    });
    onUpdateOrders(updated);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.responsibleMaster.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'Все' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-[#f8f9fa] overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e6eb] pb-6">
          <div>
            <div className="text-xs font-bold text-[#c26d45] uppercase tracking-wider">
              Управление производством
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181b] mt-0.5">
              Заказы цеха и монтажи
            </h1>
            <p className="text-sm text-[#71717a] mt-1">
              Канбан-доска стадий: от закупки материалов до сдачи мебели клиенту
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Поиск заказа, мастера..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#d4d4d8] rounded-lg focus:outline-none focus:border-[#18181b]"
              />
            </div>
          </div>
        </div>

        {/* KANBAN BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {columns.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#f0f1f4] rounded-xl p-3 flex flex-col min-h-[580px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                    <span className="text-xs font-bold text-[#18181b]">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold bg-white text-[#52525b] px-1.5 py-0.2 rounded shadow-2xs">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 flex-1">
                  {colOrders.length === 0 ? (
                    <div className="h-28 border border-dashed border-[#d4d4d8] rounded-lg flex items-center justify-center text-[11px] text-[#9ca3af]">
                      Нет заказов
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const advancePercent = Math.min(
                        100,
                        Math.round((order.advancePaid / order.totalPrice) * 100)
                      );

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-[#e4e6eb] hover:border-[#b4b7bd] rounded-lg p-3 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group"
                        >
                          {/* Order Number & Type */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-[#18181b]">
                              {order.orderNumber}
                            </span>
                            <span className="text-[#71717a]">{order.furnitureType}</span>
                          </div>

                          {/* Project Name */}
                          <div
                            onClick={() => onSelectProjectById(order.projectId)}
                            className="font-bold text-xs text-[#18181b] hover:text-[#c26d45] cursor-pointer transition-colors leading-snug truncate"
                          >
                            {order.projectName}
                          </div>

                          {/* Customer & Phone */}
                          <div className="text-[11px] text-[#52525b] space-y-0.5">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 text-[#9ca3af] shrink-0" />
                              <span className="truncate">{order.customerName}</span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-[#71717a]">
                              <Phone className="w-3 h-3 text-[#9ca3af] shrink-0" />
                              <span>{order.customerPhone}</span>
                            </div>
                          </div>

                          {/* Master */}
                          <div className="text-[10px] text-[#71717a] bg-[#fafafa] p-1.5 rounded border border-[#f0f0f2]">
                            Мастер: <strong className="text-[#374151]">{order.responsibleMaster}</strong>
                          </div>

                          {/* Price & Advance */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-[#71717a]">Итого:</span>
                              <span className="font-bold text-[#18181b]">
                                {order.totalPrice.toLocaleString('ru-RU')} KGS
                              </span>
                            </div>

                            <div className="w-full bg-[#e4e6eb] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${advancePercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                              <span>Предоплата {advancePercent}%</span>
                              <span className="font-mono">{order.advancePaid.toLocaleString('ru-RU')} KGS</span>
                            </div>
                          </div>

                          {/* Deadline */}
                          <div className="flex items-center justify-between pt-1 border-t border-[#f0f0f2] text-[10px]">
                            <div className="flex items-center gap-1 text-[#71717a]">
                              <Calendar className="w-3 h-3 text-[#9ca3af]" />
                              <span>Срок: {order.deadlineDate}</span>
                            </div>

                            {/* Advance stage button */}
                            {order.status !== 'Готово' && (
                              <button
                                onClick={() => handleAdvanceStatus(order.id)}
                                title="Перевести на следующий этап"
                                className="p-1 hover:bg-[#faf3ee] text-[#c26d45] rounded transition-colors"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
