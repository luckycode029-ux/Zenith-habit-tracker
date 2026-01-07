
import { Habit } from './types';

export const INITIAL_HABITS: Habit[] = [
  { id: '1', name: 'Exercise', emoji: '💪', assignedDays: [0, 1, 2, 3, 4, 5, 6] },
  { id: '2', name: 'Deep Work', emoji: '💻', assignedDays: [1, 2, 3, 4, 5] },
  { id: '3', name: 'Reading', emoji: '📚', assignedDays: [0, 1, 2, 3, 4, 5, 6] },
  { id: '4', name: 'Meditation', emoji: '🧘', assignedDays: [0, 1, 2, 3, 4, 5, 6] },
  { id: '5', name: 'Hydration', emoji: '💧', assignedDays: [0, 1, 2, 3, 4, 5, 6] }
];

export const MAX_HABITS = 15;

export const DAYS_IN_TRACKER = 31; // We show up to 31 slots
