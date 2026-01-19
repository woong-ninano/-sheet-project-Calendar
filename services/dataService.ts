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
    redirect: 'follow', 
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        console.error(`GAS API Error: ${response.status} ${response.statusText}`);
        throw new Error(`Network response was not ok: ${response.status}`);
    }
    
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        // 만약 GAS가 { result: 'success', data: [...] } 형태로 준다면 data를 반환
        // 현재는 직접 배열을 반환한다고 가정
        return json;
    } catch (e) {
        console.error("JSON 파싱 에러. 응답이 HTML일 수 있습니다 (권한 설정 확인 필요):", text.slice(0, 150));
        throw new Error("데이터를 불러오지 못했습니다. (GAS 권한이 'Anyone'으로 설정되었는지 확인해주세요)");
    }
  } catch (error) {
    console.error("fetchGAS 실패:", error);
    // 에러 발생 시 빈 배열이나 null을 반환하여 앱이 멈추지 않게 함
    // 호출하는 쪽에서 배열을 기대하므로 빈 배열 반환 시도 (위험할 수 있으나 UI 크래시 방지)
    return []; 
  }
};

// --- 직원 관련 함수 ---
export const getEmployees = async (): Promise<Employee[]> => {
  const data = await fetchGAS({ action: 'getEmployees' });
  // 배열이 아닌 경우(에러 등) 빈 배열 반환
  return Array.isArray(data) ? data : [];
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
  const data = await fetchGAS({ action: 'getVacations' });
  return Array.isArray(data) ? data : [];
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