import React, { useState, useEffect } from 'react';
import { Employee, VacationType } from '../types';
import { getEmployees, addVacation } from '../services/dataService';
import { PlusCircle, CalendarDays, ArrowRight } from 'lucide-react';

export const VacationForm: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Vacation Entry State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  
  // Changed to Start/End dates
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  
  const [vacationType, setVacationType] = useState<VacationType>(VacationType.FULL);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const refreshData = async () => {
      const data = await getEmployees();
      setEmployees(data);
      if (data.length > 0 && !selectedEmpId) {
        setSelectedEmpId(data[0].id);
      }
    };
    refreshData();
  }, []);

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || isSubmitting) return;
    
    // Validate Dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      alert('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    setIsSubmitting(true);

    // Iterate through dates
    let currentDate = new Date(start);
    let count = 0;

    const promises = [];
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      promises.push(addVacation(selectedEmpId, dateStr, vacationType));
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      count++;
    }

    await Promise.all(promises);

    window.dispatchEvent(new Event('data-updated'));
    alert(`총 ${count}일의 휴가가 등록되었습니다.`);
    
    // Reset dates to today
    setStartDate(today);
    setEndDate(today);
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-indigo-600" />
          휴가 등록
        </h3>
        <form onSubmit={handleVacationSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름 선택</label>
            <div className="relative">
              <select 
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full appearance-none rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                {employees.length === 0 && <option>등록된 인원이 없습니다.</option>}
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            {employees.length === 0 && (
              <p className="text-xs text-red-500 mt-1">현황 대시보드에서 인원을 먼저 등록해주세요.</p>
            )}
          </div>

          {/* Date Selection (Range) */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <CalendarDays className="w-4 h-4 text-gray-500" /> 날짜 선택 (기간)
            </label>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <div className="w-full">
                <span className="text-xs text-gray-500 mb-1 block md:hidden">시작일</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border-gray-300 border p-2 text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <ArrowRight className="text-gray-400 rotate-90 md:rotate-0" size={20} />
              
              <div className="w-full">
                <span className="text-xs text-gray-500 mb-1 block md:hidden">종료일</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full rounded-lg border-gray-300 border p-2 text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 여러 날짜를 선택하려면 시작일과 종료일을 다르게 설정하세요.<br/>
              * 주말이 포함된 경우 모두 등록되니 확인 후 캘린더에서 삭제하세요.
            </p>
          </div>

          {/* Vacation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">휴가 종류</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(VacationType).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVacationType(type)}
                  className={`py-3 px-4 rounded-lg text-sm font-medium border transition-all ${
                    vacationType === type 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 ring-offset-1' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={employees.length === 0 || isSubmitting}
            className={`w-full font-bold py-3.5 rounded-lg shadow-md transition-colors mt-4 ${
              employees.length === 0 || isSubmitting
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSubmitting ? '등록 중...' : '휴가 등록하기'}
          </button>
        </form>
      </div>
    </div>
  );
};