import React, { useEffect, useState } from 'react';
import { Employee, VacationEntry } from '../types';
import { getEmployees, getVacations, saveEmployee, updateEmployee, deleteEmployee, calculateManMonths } from '../services/dataService';
import { Users, CalendarRange, Edit2, Trash2, PlusCircle, Check, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<VacationEntry[]>([]);
  const [tick, setTick] = useState(0);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  // New Employee State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpStart, setNewEmpStart] = useState('2025-01-01');
  const [newEmpEnd, setNewEmpEnd] = useState('2025-12-31');

  useEffect(() => {
    const loadData = async () => {
      const emps = await getEmployees();
      const vacs = await getVacations();
      setEmployees(emps);
      setVacations(vacs);
    };
    loadData();
  }, [tick]);

  useEffect(() => {
    const handleRefresh = () => setTick(t => t + 1);
    window.dispatchEvent(new Event('data-updated')); // Initial Trigger for other components if needed
    window.addEventListener('data-updated', handleRefresh);
    return () => window.removeEventListener('data-updated', handleRefresh);
  }, []);

  const calculateStats = (emp: Employee) => {
    const empVacations = vacations.filter(v => v.employeeId === emp.id);
    const used = empVacations.reduce((acc, curr) => acc + curr.cost, 0);
    const remaining = emp.totalVacationDays - used;
    return { used, remaining };
  };

  // --- Edit Logic ---
  const startEditing = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ ...emp });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (field: keyof Employee, value: string) => {
    let updatedForm = { ...editForm, [field]: value };

    // Auto calculate MM and Vacation Days if dates change
    if (field === 'startDate' || field === 'endDate') {
      const start = field === 'startDate' ? value : editForm.startDate;
      const end = field === 'endDate' ? value : editForm.endDate;
      
      if (start && end) {
        const mm = calculateManMonths(start, end);
        updatedForm.manMonths = mm;
        updatedForm.totalVacationDays = mm; // Rule: Vacation Days = MM
      }
    }

    setEditForm(updatedForm);
  };

  const saveEdit = async () => {
    if (editingId && editForm.name && editForm.startDate && editForm.endDate) {
      await updateEmployee(editForm as Employee);
      setEditingId(null);
      window.dispatchEvent(new Event('data-updated'));
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까? 해당 인원의 모든 휴가 기록도 삭제됩니다.')) {
      await deleteEmployee(id);
      window.dispatchEvent(new Event('data-updated'));
    }
  };

  // --- Create Logic ---
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const mm = calculateManMonths(newEmpStart, newEmpEnd);
    
    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name: newEmpName,
      startDate: newEmpStart,
      endDate: newEmpEnd,
      manMonths: mm,
      totalVacationDays: mm // Rule: Vacation Days = MM
    };
    await saveEmployee(newEmp);
    window.dispatchEvent(new Event('data-updated'));
    
    // Reset
    setNewEmpName('');
    alert('신규 인원이 등록되었습니다.');
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-8 pb-24">
      
      {/* Employee Cards */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          프로젝트 인원 현황
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {employees.map(emp => {
            const { used, remaining } = calculateStats(emp);
            const isNegative = remaining < 0;
            const isEditing = editingId === emp.id;

            return (
              <div key={emp.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isEditing ? (
                  // Edit Mode
                  <div className="p-4 space-y-3 bg-blue-50/50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-blue-900">정보 수정</h3>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">이름</label>
                      <input 
                        className="w-full text-sm border rounded p-1" 
                        value={editForm.name} 
                        onChange={e => handleEditChange('name', e.target.value)} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">투입일</label>
                        <input 
                          type="date" 
                          className="w-full text-sm border rounded p-1" 
                          value={editForm.startDate} 
                          onChange={e => handleEditChange('startDate', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">철수일</label>
                        <input 
                          type="date" 
                          className="w-full text-sm border rounded p-1" 
                          value={editForm.endDate} 
                          onChange={e => handleEditChange('endDate', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-100 p-2 rounded">
                      <span>자동계산: {editForm.manMonths} MM / 휴가 {editForm.totalVacationDays}일</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm flex justify-center items-center gap-1">
                        <Check size={14} /> 저장
                      </button>
                      <button onClick={cancelEditing} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm flex justify-center items-center gap-1">
                        <X size={14} /> 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="px-5 py-4 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{emp.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                           <CalendarRange size={14} />
                           {emp.startDate} ~ {emp.endDate}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditing(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="px-5 pb-5">
                      <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center divide-x divide-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">투입공수</p>
                          <p className="font-semibold text-gray-700">{emp.manMonths} MM</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">사용휴가</p>
                          <p className="font-semibold text-gray-700">{used}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">잔여휴가</p>
                          <p className={`font-bold ${isNegative ? 'text-red-500' : 'text-emerald-600'}`}>
                            {remaining > 0 ? '+' : ''}{Number(remaining).toFixed(2).replace(/\.00$/, '')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Create New Employee Section (Moved from Register Tab) */}
      <section className="bg-gray-100 rounded-xl p-5 border border-gray-200">
        <h3 className="text-md font-bold text-gray-700 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-indigo-600" />
          신규 인원 등록
        </h3>
        <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">이름</label>
            <input 
              type="text"
              required
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="이름 입력"
              className="w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">투입일</label>
            <input 
              type="date"
              required
              value={newEmpStart}
              onChange={(e) => setNewEmpStart(e.target.value)}
              className="w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">철수일</label>
            <input 
              type="date"
              required
              value={newEmpEnd}
              onChange={(e) => setNewEmpEnd(e.target.value)}
              className="w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-1">
             <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md shadow transition-colors text-sm h-[38px]"
            >
              등록 (MM 자동계산)
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2 ml-1">* 투입일과 철수일을 입력하면 공수(MM)와 총 휴가일이 자동으로 계산됩니다.</p>
      </section>

    </div>
  );
};