import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { getEmployees, getVacations, removeVacation, getHolidays } from '../services/dataService';
import { Employee, VacationEntry, VacationType, Holiday } from '../types';

export const CalendarView: React.FC = () => {
  // 시작날짜를 오늘로 설정 (접속 시 이번 달 보여줌)
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
      try {
        const emps = await getEmployees();
        const vacs = await getVacations();
        setEmployees(emps);
        setVacations(vacs);
        setHolidays(getHolidays());
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      }
    };
    fetchData();
  }, [tick]);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.addEventListener('data-updated', handleRefresh);
    return () => window.removeEventListener('data-updated', handleRefresh);
  }, []);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
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
    
    // 오늘 날짜 계산
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const days = [];
    
    // Empty cells (이전 달의 공간)
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[90px] md:min-h-[110px] bg-gray-50/40 border-r border-b border-gray-100"></div>);
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
      if (isToday) dateTextColor = 'text-blue-700 font-extrabold';

      // Background Color Logic
      let cellBgClass = 'bg-white hover:bg-gray-50'; // 기본 평일

      if (isWeekend) {
        cellBgClass = 'bg-gray-50 hover:bg-gray-100'; // 주말: 차분한 회색
      }
      
      if (isHoliday) {
        cellBgClass = 'bg-red-50 hover:bg-red-100'; // 공휴일: 연한 빨강 (강조)
      }

      if (isToday) {
        cellBgClass = 'bg-blue-50 ring-2 ring-inset ring-blue-200'; // 오늘: 파랑 강조 (최우선)
      }

      days.push(
        <div 
          key={day} 
          onClick={() => handleDayClick(dateStr)}
          className={`min-h-[90px] md:min-h-[110px] p-0.5 md:p-1 border-r border-b border-gray-100 cursor-pointer transition-colors ${cellBgClass}`}
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-1">
            <span className={`text-sm pl-1 ${dateTextColor} ${isToday ? 'scale-110 origin-left' : ''}`}>
              {day}
            </span>
            {isHoliday && (
              // 휴일 배지 제거 -> 텍스트로 변경
              <span className="text-[10px] md:text-xs text-red-500 font-bold truncate pl-1 md:pl-0">
                {holiday.name}
              </span>
            )}
            {isToday && !isHoliday && (
              <span className="hidden md:inline-block text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full font-bold">Today</span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 md:gap-1 mt-0.5">
            {dayVacations.map(vac => {
              const empName = employees.find(e => e.id === vac.employeeId)?.name || '미상';
              
              // 뱃지 스타일 개선
              let badgeStyle = 'bg-blue-100 text-blue-900 border-blue-200';
              if (vac.type.includes('반차')) badgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
              if (vac.type === VacationType.QUARTER) badgeStyle = 'bg-purple-100 text-purple-900 border-purple-200';

              return (
                <div 
                  key={vac.id} 
                  // 모바일 최적화: text-[10px], px-0.5 (패딩 축소), h-auto
                  className={`text-[10px] md:text-xs px-0.5 py-0.5 md:px-1.5 md:py-1 rounded shadow-sm border flex items-center justify-center ${badgeStyle}`}
                >
                  <span className="font-bold truncate w-full text-center leading-tight">{empName}</span>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-gray-200">
          <div className="bg-white px-5 py-4 border-b border-gray-100 flex justify-between items-center">
             <div className="flex flex-col">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <CalendarIcon size={20} className="text-indigo-600"/> 
                 <span className="mt-0.5">{formattedDate}</span>
               </h3>
               {holiday && <span className="text-sm text-red-500 font-bold mt-1 ml-1">🎈 {holiday.name}</span>}
             </div>
             <button onClick={closeModal} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
               <X size={24} />
             </button>
          </div>
          
          <div className="p-5 max-h-[60vh] overflow-y-auto bg-gray-50/50">
            {dayVacations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">등록된 휴가가 없습니다.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {dayVacations.map(vac => {
                  const empName = employees.find(e => e.id === vac.employeeId)?.name || '데이터 없음';
                  
                  let typeColor = 'text-blue-700 bg-blue-50 border-blue-200';
                  if (vac.type.includes('반차')) typeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                  if (vac.type === VacationType.QUARTER) typeColor = 'text-purple-700 bg-purple-50 border-purple-200';

                  return (
                    <li key={vac.id} className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${typeColor.replace('text-', 'bg-').split(' ')[0].replace('50', '500')}`}></div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-lg">{empName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md w-fit mt-1 border font-medium ${typeColor}`}>
                            {vac.type}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(vac.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="삭제"
                      >
                        <Trash2 size={20} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-gray-100">
            <button onClick={closeModal} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition-colors">
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
      <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="px-4 py-4 md:px-8 md:py-6 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 tracking-tight">
            {currentDate.getFullYear()}년 <span className="text-indigo-600">{currentDate.getMonth() + 1}월</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all hover:shadow-md">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all hover:shadow-md">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0">
          {weeks.map((w, idx) => (
            <div key={w} className={`py-3 text-center text-sm font-bold ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200">
          {renderCalendarDays()}
        </div>
      </div>

      {isModalOpen && renderModalContent()}
    </div>
  );
};