import { Employee, VacationEntry, VacationType, VACATION_COST, Holiday } from '../types';

// 환경 변수가 로드되지 않는 환경(import.meta.env undefined)을 대비하여 안전하게 접근하고,
// 값이 없을 경우 하드코딩된 GAS Web App URL을 사용합니다.
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbza2sIu1EfJx7vElObZjBy4R-jwtHdNQdEr6GFXsOv7BdAna4vZe3GFxvWO7sjLtlg6/exec';

// Type assertion to avoid TypeScript errors when vite/client types are missing
const env = (import.meta as any).env;
const GAS_URL = (env && env.VITE_GAS_APP_URL) ? env.VITE_GAS_APP_URL : DEFAULT_GAS_URL;

// --- 공통 Fetch 헬퍼 ---
const fetchGAS = async (params: Record<string, string>, body?: any) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `${GAS_URL}?${queryString}`;
  
  const options: RequestInit = {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    // 리다이렉트를 자동으로 따라가도록 설정
    redirect: 'follow', 
    // 브라우저 캐시 방지 (선택)
    cache: 'no-cache' 
  };

  // POST 요청 시 구글 앱스 스크립트는 content-type 제한이 엄격하므로 헤더를 생략하거나 
  // 필요에 따라 아래와 같이 설정할 수 있습니다.
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

// --- 직원 관련 함수 ---
export const getEmployees = async (): Promise<Employee[]> => {
  return fetchGAS({ action: 'getEmployees' });
};

export const saveEmployee = async (employee: Employee): Promise<void> => {
  await fetchGAS({}, { action: 'saveEmployee', payload: employee });
};

export const updateEmployee = async (employee: Employee): Promise<void> => {
  await saveEmployee(employee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await fetchGAS({}, { action: 'deleteEmployee', id });
};

// --- 휴가 관련 함수 ---
export const getVacations = async (): Promise<VacationEntry[]> => {
  return fetchGAS({ action: 'getVacations' });
};

export const addVacation = async (employeeId: string, date: string, type: VacationType): Promise<void> => {
  const newEntry = {
    id: `vac_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    employeeId,
    date,
    type,
    cost: VACATION_COST[type]
  };
  await fetchGAS({}, { action: 'addVacation', payload: newEntry });
};

export const removeVacation = async (id: string): Promise<void> => {
  await fetchGAS({}, { action: 'removeVacation', id });
};

// --- 공휴일 및 계산 로직 ---

const HOLIDAYS: Holiday[] = [
  { date: '2025-01-01', name: '신정' },
  { date: '2025-01-28', name: '설날 연휴' },
  { date: '2025-01-29', name: '설날' },
  { date: '2025-01-30', name: '설날 연휴' },
  { date: '2025-03-01', name: '3·1절' },
  { date: '2025-03-03', name: '대체공휴일(3·1절)' }, 
  { date: '2025-05-05', name: '어린이날' },
  { date: '2025-05-06', name: '부처님오신날' },
  { date: '2025-06-06', name: '현충일' },
  { date: '2025-08-15', name: '광복절' },
  { date: '2025-10-03', name: '개천절' },
  { date: '2025-10-05', name: '추석 연휴' },
  { date: '2025-10-06', name: '추석' },
  { date: '2025-10-07', name: '추석 연휴' },
  { date: '2025-10-08', name: '대체공휴일(추석)' }, 
  { date: '2025-10-09', name: '한글날' },
  { date: '2025-12-25', name: '크리스마스' },
  { date: '2026-01-01', name: '신정' },
  { date: '2026-02-17', name: '설날 연휴' },
  { date: '2026-02-18', name: '설날' },
  { date: '2026-02-19', name: '설날 연휴' },
];

export const getHolidays = (): Holiday[] => {
  return HOLIDAYS;
};

export const calculateManMonths = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  const mm = (diffDays / 30.4).toFixed(1); 
  return parseFloat(mm);
};