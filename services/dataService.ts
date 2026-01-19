import { Employee, VacationEntry, VacationType, VACATION_COST, Holiday } from '../types';

// .env에 있는 VITE_GAS_APP_URL을 우선적으로 사용합니다.
// 배포 후 URL이 변경되었다면 .env를 꼭 수정해주세요.
const DEFAULT_GAS_URL = ''; // 보안상 기본값 제거, .env 사용 권장

// Type assertion to avoid TypeScript errors when vite/client types are missing
const env = (import.meta as any).env;
const GAS_URL = (env && env.VITE_GAS_APP_URL) ? env.VITE_GAS_APP_URL : DEFAULT_GAS_URL;

// --- 공통 Fetch 헬퍼 ---
const fetchGAS = async (params: Record<string, string>, body?: any) => {
  if (!GAS_URL) {
    console.error("GAS URL이 설정되지 않았습니다. .env 파일을 확인해주세요.");
    return [];
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${GAS_URL}?${queryString}`;
  
  const options: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // CORS 문제 해결 핵심
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        if (json.error) {
           console.error("GAS 서버 에러:", json.error);
           alert(`서버 에러 발생: ${json.error}`);
           return [];
        }
        return json;
    } catch (e) {
        console.error("데이터 파싱 실패:", text);
        return [];
    }
  } catch (error) {
    console.error("네트워크 통신 실패:", error);
    return []; 
  }
};

// --- 직원 관련 함수 ---
export const getEmployees = async (): Promise<Employee[]> => {
  const data = await fetchGAS({ action: 'getEmployees' });
  // 데이터가 없거나 에러일 경우 빈 배열 반환
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
    id: `vac_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
];

export const getHolidays = (): Holiday[] => {
  return HOLIDAYS;
};

export const calculateManMonths = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  
  const diffTime = endDate.getTime() - startDate.getTime();
  if (diffTime < 0) return 0;

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일 포함
  
  const mm = (diffDays / 30.417).toFixed(1); 
  return parseFloat(mm);
};