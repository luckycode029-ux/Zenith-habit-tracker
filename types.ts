
export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  assignedDays: number[]; // 0 for Sunday, 1 for Monday, etc.
  createdAt?: string; // YYYY-MM-DD
}

export interface DayData {
  habitIds: string[];
  sleepHours?: number;
}

export interface AppState {
  habitsStartDate: string; // ISO date string YYYY-MM-DD
  habits: Habit[];
  data: {
    [dateKey: string]: DayData; // dateKey: "YYYY-MM-DD"
  };
  isLocked: boolean; // Whether the 30-day cycle has been committed to
  sleepGoal: number; // Daily target sleep hours
}
