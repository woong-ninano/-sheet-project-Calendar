export enum VacationType {
  FULL = '연차',
  HALF_AM = '오전반차',
  HALF_PM = '오후반차',
  QUARTER = '반반차'
}

export const VACATION_COST: Record<VacationType, number> = {
  [VacationType.FULL]: 1.0,
  [VacationType.HALF_AM]: 0.5,
  [VacationType.HALF_PM]: 0.5,
  [VacationType.QUARTER]: 0.25,
};

export interface Employee {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  manMonths: number;
  totalVacationDays: number; // The allowance
}

export interface VacationEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: VacationType;
  cost: number;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}