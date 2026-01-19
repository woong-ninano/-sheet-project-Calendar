import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { getEmployees, getVacations, removeVacation, getHolidays } from '../services/dataService';
import { Employee, VacationEntry, VacationType, Holiday } from '../types';

export const CalendarView: React.FC = () => {
  // Initialize with today's date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<VacationEntry[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [tick, setTick] = useState(0);

  // Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const emps = await getEmployees();
      const vacs = await getVacations();
      setEmployees(emps);
      setVacations(vacs);
      setHolidays(getHolidays());
    };
    fetchData();
  }, [tick]);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.addEventListener('data-updated', handleRefresh);
    return () => window.removeEventListener('data-updated', handleRefresh);
  }, []);

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 이 휴가 기록을 삭제하시겠습니까?')) {
      await removeVacation(id);
      window.dispatchEvent(new Event('data-updated'));
    }
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  // --- Render Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    
    // Calculate today's date string for highlighting
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const days = [];
    
    // Empty cells
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] bg-gray-50/30 border-r border-b border-gray-100"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayVacations = vacations.filter(v => v.date === dateStr);
      const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
      
      const holiday = holidays.find(h => h.date === dateStr);
      const isHoliday = !!holiday;
      const isToday = dateStr === todayStr;

      // Text Color Logic
      let dateTextColor = 'text-gray-700';
      if (isWeekend) dateTextColor = 'text-red-400';
      if (isHoliday) dateTextColor = 'text-red-600';
      if (isToday) dateTextColor = 'text-blue-700 font-bold';

      // Background Color Logic
      let cellBgClass = 'bg-white';
      if (isWeekend || isHoliday) cellBgClass = 'bg-slate-50/50';
      if (isToday) cellBgClass = 'bg-blue-50 ring-1 ring-inset ring-blue-300';

      days.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(dateStr)}
          className={`min-h-[80px] md:min-h-[100px] p-0.5 md:p-1 border-r border-b border-gray-100 cursor-pointer transition-colors active:bg-gray-100 ${cellBgClass}`}
        >
          <div className="flex justify-between items-start mb-1 px-0.5">
            <span className={`text-xs md:text-sm font-semibold pl-0.5 ${dateTextColor}`}>
              {day}
            </span>
            {isHoliday && (
              <span className="text-[10px] text-red-500 font-medium pr-0.5 truncate max-w-[50px] md:max-w-none text-right">
                {holiday.name}
              </span>
            )}
            {isToday && !isHoliday && (
              <span className="text-[10px] text-blue-600 font-medium pr-0.5">오늘</span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 md:gap-1">
            {dayVacations.map(vac => {
              const empName = employees.find(e => e.id === vac.employeeId)?.name || 'Unknown';
              
              let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
              if (vac.type.includes('반차')) badgeStyle = 'bg-amber-50 text-amber-700 border-amber-100';
              if (vac.type === VacationType.QUARTER) badgeStyle = 'bg-purple-50 text-purple-700 border-purple-100';

              return (
                <div 
                  key={vac.id} 
                  className={`text-[10px] md:text-xs px-1 py-0.5 md:px-1.5 md:py-1 rounded-sm md:rounded-md flex items-center justify-between border shadow-sm ${badgeStyle}`}
                >
                  <span className="font-bold whitespace-nowrap overflow-hidden text-ellipsis mr-0.5 tracking-tighter">{empName}</span>
                  <span className="opacity-80 text-[9px] md:text-[10px] whitespace-nowrap hidden md:inline-block">{vac.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  // --- Modal Content ---
  const renderModalContent = () => {
    if (!selectedDate) return null;
    const dayVacations = vacations.filter(v => v.date === selectedDate);
    const dateObj = new Date(selectedDate);
    const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
    const holiday = holidays.find(h => h.date === selectedDate);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
             <div className="flex flex-col">
               <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <CalendarIcon size={18} className="text-blue-600"/> {formattedDate}
               </h3>
               {holiday && <span className="text-xs text-red-500 font-medium ml-7">{holiday.name}</span>}
             </div>
             <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
               <X size={20} />
             </button>
          </div>
          
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {dayVacations.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">등록된 휴가가 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {dayVacations.map(vac => {
                  const empName = employees.find(e => e.id === vac.employeeId)?.name || '미확인';
                  
                  let typeColor = 'text-blue-600 bg-blue-50 border-blue-100';
                  if (vac.type.includes('반차')) typeColor = 'text-amber-600 bg-amber-50 border-amber-100';
                  if (vac.type === VacationType.QUARTER) typeColor = 'text-purple-600 bg-purple-50 border-purple-100';

                  return (
                    <li key={vac.id} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-lg">{empName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit mt-1 border ${typeColor}`}>
                          {vac.type}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(vac.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <button onClick={closeModal} className="text-sm text-gray-600 font-medium hover:text-gray-900">
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  const weeks = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-7xl mx-auto md:p-6 p-2 pb-24">
      <div className="bg-white shadow-sm md:shadow-lg rounded-xl md:rounded-2xl border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold text-gray-800">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </h2>
          <div className="flex gap-1 md:gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => changeMonth(1)} className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weeks.map((w, idx) => (
            <div key={w} className={`py-2 md:py-3 text-center text-xs md:text-sm font-bold ${idx === 0 ? 'text-red-500' : 'text-gray-600'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>

      {isModalOpen && renderModalContent()}
    </div>
  );
};