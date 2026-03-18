import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  period: string;
  startDate?: string;
  endDate?: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  'Todo o período',
  'Últimos 30 dias',
  'Este mês',
  'Mês passado',
  'Personalizado'
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const formatYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseYYYYMMDD = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function DateRangePicker({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync temp range when opened
  useEffect(() => {
    if (isOpen) {
      setTempRange(value);
      if (value.startDate) {
        setCurrentMonth(parseYYYYMMDD(value.startDate));
      } else {
        setCurrentMonth(new Date());
      }
      setSelecting('start');
    }
  }, [isOpen, value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePresetClick = (preset: string) => {
    if (preset === 'Personalizado') {
      setTempRange({ period: preset, startDate: undefined, endDate: undefined });
      setSelecting('start');
    } else {
      const newRange = { period: preset };
      setTempRange(newRange);
      onChange(newRange);
      setIsOpen(false);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatYYYYMMDD(date);
    
    if (tempRange.period !== 'Personalizado') {
      setTempRange({ period: 'Personalizado', startDate: dateStr, endDate: undefined });
      setSelecting('end');
      return;
    }

    if (selecting === 'start') {
      setTempRange({ period: 'Personalizado', startDate: dateStr, endDate: undefined });
      setSelecting('end');
    } else {
      if (tempRange.startDate && parseYYYYMMDD(dateStr) < parseYYYYMMDD(tempRange.startDate)) {
        // If end date is before start date, swap them
        setTempRange({ period: 'Personalizado', startDate: dateStr, endDate: tempRange.startDate });
      } else {
        setTempRange({ ...tempRange, endDate: dateStr });
      }
      setSelecting('start');
    }
  };

  const handleApply = () => {
    if (tempRange.period === 'Personalizado' && (!tempRange.startDate || !tempRange.endDate)) {
      alert('Selecione uma data de início e fim.');
      return; // Need both dates for custom
    }
    onChange(tempRange);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = formatYYYYMMDD(date);
      
      let isSelected = false;
      let isInRange = false;
      let isStart = false;
      let isEnd = false;

      if (tempRange.period === 'Personalizado') {
        if (tempRange.startDate === dateStr) {
          isSelected = true;
          isStart = true;
        }
        if (tempRange.endDate === dateStr) {
          isSelected = true;
          isEnd = true;
        }
        if (tempRange.startDate && tempRange.endDate) {
          const start = parseYYYYMMDD(tempRange.startDate);
          const end = parseYYYYMMDD(tempRange.endDate);
          if (date > start && date < end) {
            isInRange = true;
          }
        }
      }

      days.push(
        <button
          key={i}
          onClick={() => handleDateClick(date)}
          className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors
            ${isSelected ? 'bg-blue-600 text-white font-medium' : ''}
            ${isInRange && !isSelected ? 'bg-blue-600/20 text-blue-400' : ''}
            ${!isSelected && !isInRange ? 'text-slate-300 hover:bg-[#2a2d3d]' : ''}
          `}
        >
          {i}
        </button>
      );
    }
    
    return days;
  };

  const getDisplayText = () => {
    if (value.period !== 'Personalizado') return value.period;
    if (value.startDate && value.endDate) {
      const start = parseYYYYMMDD(value.startDate).toLocaleDateString('pt-BR');
      const end = parseYYYYMMDD(value.endDate).toLocaleDateString('pt-BR');
      return `${start} - ${end}`;
    }
    return 'Personalizado';
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-slate-300 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-[#2a2d3d] transition-colors"
      >
        <CalendarIcon size={16} className="text-slate-400" />
        <span className="text-sm">{getDisplayText()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#242731] border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col md:flex-row overflow-hidden w-[300px] md:w-[500px]">
          {/* Presets Sidebar */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-slate-700 bg-[#1a1c23]">
            <div className="p-2 flex flex-col">
              {PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                    tempRange.period === preset 
                      ? 'bg-blue-600/20 text-blue-400 font-medium' 
                      : 'text-slate-300 hover:bg-[#242731]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Area */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-[#2a2d3d] rounded-lg text-slate-400 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-slate-200">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-[#2a2d3d] rounded-lg text-slate-400 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day, i) => (
                <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-slate-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>

            {tempRange.period === 'Personalizado' && (
              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end space-x-2">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleApply}
                  disabled={!tempRange.startDate || !tempRange.endDate}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
