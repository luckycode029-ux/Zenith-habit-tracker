
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, BarChart2, Calendar, Settings, Check, Sun, Moon, Lock, X, ChevronRight, Smile, RotateCcw, Quote, AlertCircle, RefreshCw, CalendarDays, ShieldCheck, ArrowRight, Info, Coffee, Bed, GripVertical, Clock } from 'lucide-react';
import { AppState, Habit } from './types';
import { INITIAL_HABITS, MAX_HABITS } from './constants';
import HabitGrid from './components/HabitGrid';
import StatsSection from './components/StatsSection';

const App: React.FC = () => {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const getNextMondayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('zenith_theme') === 'dark' ? 'dark' : 'light';
  });

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('zenith_state');
    const todayStr = getTodayStr();
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.habitsStartDate && parsed.protocolStartDate) {
          parsed.habitsStartDate = parsed.protocolStartDate;
        }
        if (!parsed.habitsStartDate || isNaN(new Date(parsed.habitsStartDate).getTime())) {
          parsed.habitsStartDate = todayStr;
        }
        if (parsed.isLocked === undefined) parsed.isLocked = false;
        if (parsed.sleepGoal === undefined) parsed.sleepGoal = 7;
        
        // Migrate old habits without assignedDays or createdAt
        if (parsed.habits) {
          parsed.habits = parsed.habits.map((h: any) => ({
            ...h,
            assignedDays: h.assignedDays || [0, 1, 2, 3, 4, 5, 6],
            createdAt: h.createdAt || parsed.habitsStartDate || todayStr
          }));
        }

        return parsed;
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    
    return {
      habitsStartDate: todayStr,
      habits: INITIAL_HABITS.map(h => ({ ...h, createdAt: todayStr })),
      data: {},
      isLocked: false,
      sleepGoal: 7
    };
  });

  const [activeTab, setActiveTab] = useState<'tracker' | 'stats'>('tracker');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✨');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  useEffect(() => {
    const parts = state.habitsStartDate.split('-');
    const startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!state.isLocked && state.habitsStartDate < todayStr) {
      setState(prev => ({ ...prev, habitsStartDate: todayStr }));
    }
  }, [todayStr, state.habitsStartDate, state.isLocked]);

  useEffect(() => {
    localStorage.setItem('zenith_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('zenith_theme', theme);
  }, [theme]);

  const isHabitsActive = useMemo(() => {
    const parts = state.habitsStartDate.split('-');
    const startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);
    return new Date() < endDate;
  }, [state.habitsStartDate]);

  const cycleExpired = useMemo(() => {
    const parts = state.habitsStartDate.split('-');
    const startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);
    return new Date() >= endDate;
  }, [state.habitsStartDate]);

  const toggleHabit = (dateKey: string, habitId: string) => {
    // Habits are locked after the day ends to preserve integrity
    if (dateKey !== todayStr) return;

    setState(prev => {
      const data = { ...prev.data };
      const dayData = { ...(data[dateKey] || { habitIds: [] }) };
      
      if (dayData.habitIds.includes(habitId)) {
        dayData.habitIds = dayData.habitIds.filter(id => id !== habitId);
      } else {
        dayData.habitIds = [...dayData.habitIds, habitId];
      }
      
      data[dateKey] = dayData;
      return { ...prev, data };
    });
  };

  const updateSleep = (dateKey: string, hours: number) => {
    // Sleep tracking is allowed for today and yesterday (morning-after logging)
    if (dateKey !== todayStr && dateKey !== yesterdayStr) return;
    
    setState(prev => {
      const data = { ...prev.data };
      const dayData = { ...(data[dateKey] || { habitIds: [] }) };
      dayData.sleepHours = hours;
      data[dateKey] = dayData;
      return { ...prev, data };
    });
  };

  const updateSleepGoal = (goal: number) => {
    setState(prev => ({ ...prev, sleepGoal: goal }));
  };

  const addHabit = () => {
    if (!newHabitName.trim() || state.habits.length >= MAX_HABITS) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      emoji: newHabitEmoji.trim() || '✨',
      assignedDays: [0, 1, 2, 3, 4, 5, 6],
      createdAt: todayStr
    };
    setState(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit]
    }));
    setNewHabitName('');
    setNewHabitEmoji('✨');
  };

  const updateHabitEmoji = (id: string, emoji: string) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, emoji } : h)
    }));
  };

  const toggleHabitDay = (habitId: string, day: number) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => {
        if (h.id !== habitId) return h;
        const newDays = h.assignedDays.includes(day)
          ? h.assignedDays.filter(d => d !== day)
          : [...h.assignedDays, day];
        return { ...h, assignedDays: newDays.sort((a, b) => a - b) };
      })
    }));
  };

  const deleteHabit = (id: string) => {
    if (window.confirm('Delete this habit? Points from this habit will be removed from your totals.')) {
      setState(prev => ({
        ...prev,
        habits: prev.habits.filter(h => h.id !== id)
      }));
    }
  };

  const updateHabitsStart = (date: string) => {
    if (!date || (state.isLocked && isHabitsActive)) return;
    setState(prev => ({ ...prev, habitsStartDate: date }));
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newHabits = [...state.habits];
    const itemToMove = newHabits[draggedItemIndex];
    newHabits.splice(draggedItemIndex, 1);
    newHabits.splice(index, 0, itemToMove);
    
    setDraggedItemIndex(index);
    setState(prev => ({ ...prev, habits: newHabits }));
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const executeCommit = (clearHistory: boolean = false) => {
    setState(prev => ({ 
      ...prev, 
      isLocked: true, 
      habitsStartDate: cycleExpired ? todayStr : prev.habitsStartDate,
      data: clearHistory ? {} : prev.data
    }));
    setShowCommitConfirm(false);
    setIsEditMode(false);
  };

  const resetAllData = () => {
    if (window.confirm("CRITICAL: Wipe ALL historical data and start completely fresh?")) {
      const newState = {
        habitsStartDate: todayStr,
        habits: INITIAL_HABITS.map(h => ({ ...h, createdAt: todayStr })),
        data: {},
        isLocked: false,
        sleepGoal: 7
      };
      setState(newState);
      localStorage.setItem('zenith_state', JSON.stringify(newState));
      setIsEditMode(false);
    }
  };

  const habitsDates = useMemo(() => {
    const parts = state.habitsStartDate.split('-');
    if (parts.length !== 3) return [];
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(year, month, day + i);
      const dy = d.getFullYear();
      const dm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dy}-${dm}-${dd}`;
    });
  }, [state.habitsStartDate]);

  const cycleLabel = useMemo(() => {
    const parts = state.habitsStartDate.split('-');
    if (parts.length !== 3) return 'CYCLE';
    const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 29);
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    return `${fmt.format(start).toUpperCase()} - ${fmt.format(end).toUpperCase()}`;
  }, [state.habitsStartDate]);

  const randomQuote = useMemo(() => {
    const quotes = [
      "Discipline is doing what needs to be done, even if you don't want to do it.",
      "The price of excellence is discipline.",
      "Success is nothing more than a few simple disciplines, practiced every day.",
      "With self-discipline, most anything is possible.",
      "Discipline is the bridge between goals and accomplishment.",
      "Small disciplines repeated with consistency every day lead to great achievements.",
      "We must all suffer one of two things: the pain of discipline or the pain of regret.",
      "Discipline is choosing between what you want now and what you want most."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tighter uppercase dark:text-white">Zenith</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em]">30-Day Habit</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-white" />}
          </button>
          
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl px-3 py-2 flex items-center gap-2 border border-zinc-200 dark:border-zinc-800">
            {state.isLocked && isHabitsActive ? <Lock size={10} className="text-zinc-500" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            <span className="text-[10px] font-black mono uppercase tracking-wider text-center dark:text-zinc-300">
              {cycleLabel}
            </span>
          </div>

          <button 
            onClick={() => setIsEditMode(true)}
            className={`p-2 rounded-xl transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1">
        {activeTab === 'tracker' ? (
          <div className="p-4 space-y-8 animate-in fade-in duration-500">
            {/* Cycle Status Banner */}
            {cycleExpired && state.isLocked && (
              <div className="bg-black dark:bg-white text-white dark:text-black p-5 rounded-3xl flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Habit Cycle Finished</span>
                  </div>
                  <p className="text-[9px] font-medium opacity-60 uppercase tracking-tighter">Ready for the next 30 days of excellence?</p>
                </div>
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="bg-zinc-800 dark:bg-zinc-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  Renew <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* Table Container */}
            <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden`}>
              <HabitGrid 
                habits={state.habits}
                data={state.data}
                onToggleHabit={toggleHabit}
                onUpdateSleep={updateSleep}
                habitsDates={habitsDates}
              />
            </div>

            {/* Quote Section */}
            <div className="px-2">
              <div className="bg-zinc-100 dark:bg-zinc-900/50 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group">
                <div className="absolute top-4 left-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Quote size={60} className="text-black dark:text-white fill-current" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-4 text-zinc-400 dark:text-zinc-500">Philosophical Drift</h3>
                  <p className="text-sm font-bold leading-relaxed italic tracking-tight text-zinc-800 dark:text-zinc-200">
                    "{randomQuote}"
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Stoic Framework</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-12 text-center opacity-30">
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 dark:text-zinc-500">
                Made by lucky
              </span>
            </div>
          </div>
        ) : (
          <StatsSection state={state} />
        )}

        {/* Professional Settings Overlay */}
        {isEditMode && (
          <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-lg font-black uppercase tracking-[0.2em] dark:text-white">Habit Setup</h2>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Configure your next 30 days</p>
              </div>
              <button 
                onClick={() => setIsEditMode(false)}
                className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-12 pb-32">
              {/* Timeline Selection Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    <CalendarDays size={14} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 uppercase">Commencement</h3>
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 space-y-6">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 px-1">Start Date</label>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { label: 'Today', date: todayStr },
                        { label: 'Tomorrow', date: getTomorrowStr() },
                        { label: 'Next Monday', date: getNextMondayStr() }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          disabled={state.isLocked && isHabitsActive}
                          onClick={() => updateHabitsStart(preset.date)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.habitsStartDate === preset.date ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400'} disabled:opacity-30`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    
                    <input 
                      type="date"
                      disabled={state.isLocked && isHabitsActive}
                      value={state.habitsStartDate}
                      onChange={(e) => updateHabitsStart(e.target.value)}
                      className={`w-full bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-black dark:focus:border-white transition-all uppercase ${state.isLocked && isHabitsActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  {(!state.isLocked || !isHabitsActive) ? (
                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-start gap-3 px-1">
                        <Info size={14} className="text-zinc-300 mt-0.5 shrink-0" />
                        <p className="text-[10px] leading-relaxed text-zinc-400 font-medium italic">Committing will lock the Habit for 30 days. You cannot change the window once started.</p>
                      </div>
                      <button 
                        onClick={() => setShowCommitConfirm(true)}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl text-xs font-black uppercase tracking-[0.4em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                      >
                        <Lock size={14} className="group-hover:rotate-12 transition-transform" /> 
                        {cycleExpired ? 'Begin New Phase' : 'Activate Habit'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                        <Lock size={16} className="text-zinc-500" />
                        <div className="flex flex-col">
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-300 font-black uppercase tracking-widest">Habit Active</p>
                          <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter">Modification locked for 30 days</p>
                        </div>
                      </div>
                      <button 
                        onClick={resetAllData}
                        className="w-full border-2 border-red-50 sm:border-red-900/10 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-[0.98] transition-all flex items-center justify-center gap-3 opacity-60 hover:opacity-100"
                      >
                        <RefreshCw size={14} /> Emergency Override
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* RECOVERY TARGET Config */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <Bed size={16} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Recovery Target</h3>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                   <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400/80 mb-6 px-1">Daily Sleep Goal (Hours)</label>
                   <div className="flex gap-3">
                      {[6, 7, 8, 9].map(target => (
                        <button
                          key={target}
                          onClick={() => updateSleepGoal(target)}
                          className={`flex-1 py-3.5 rounded-[1.25rem] text-xs font-black mono transition-all border ${state.sleepGoal === target ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-lg shadow-black/10' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}
                        >
                          {target}H
                        </button>
                      ))}
                   </div>
                </div>
              </section>

              {/* Habits Stack Configuration */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                      <Check size={14} className="text-zinc-500" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Architecture</h3>
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900 px-3 py-1 rounded-full border border-zinc-100 dark:border-zinc-800">
                    {state.habits.length} / {MAX_HABITS}
                  </span>
                </div>

                <div className="space-y-4">
                  {state.habits.map((habit, index) => (
                    <div 
                      key={habit.id} 
                      draggable={!state.isLocked || !isHabitsActive}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group flex flex-col gap-4 bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 ${draggedItemIndex === index ? 'opacity-40 scale-[0.98] border-dashed bg-zinc-50 dark:bg-zinc-800' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 p-1 hover:text-zinc-500 dark:hover:text-zinc-500 transition-colors ${state.isLocked && isHabitsActive ? 'hidden' : 'block'}`}>
                          <GripVertical size={16} />
                        </div>
                        <input 
                          type="text"
                          value={habit.emoji || ''}
                          onChange={(e) => updateHabitEmoji(habit.id, e.target.value.slice(-2))}
                          placeholder="✨"
                          className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-center text-xl outline-none border border-zinc-100 dark:border-zinc-800"
                        />
                        <span className="flex-1 text-xs font-black uppercase dark:text-zinc-200 tracking-wider truncate">{habit.name}</span>
                        <button 
                          onClick={() => deleteHabit(habit.id)}
                          className="text-zinc-300 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Day Selector */}
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 px-1">
                            <Clock size={10} className="text-zinc-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Weekly Cadence</span>
                         </div>
                         <div className="flex gap-1.5">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, dayIdx) => (
                               <button
                                 key={dayIdx}
                                 onClick={() => toggleHabitDay(habit.id, dayIdx)}
                                 className={`flex-1 h-8 rounded-lg text-[9px] font-black transition-all border ${habit.assignedDays.includes(dayIdx) 
                                   ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-md' 
                                   : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-600'}`}
                               >
                                 {dayName}
                               </button>
                            ))}
                         </div>
                      </div>
                    </div>
                  ))}

                  {state.habits.length < MAX_HABITS && (
                    <div className="mt-6 flex flex-col gap-3 p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/30 dark:bg-zinc-900/20">
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          placeholder="✨"
                          className="w-14 h-14 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-center text-xl outline-none focus:border-black dark:focus:border-white transition-all shrink-0"
                          value={newHabitEmoji}
                          onChange={(e) => setNewHabitEmoji(e.target.value.slice(-2))}
                        />
                        <input 
                          type="text"
                          placeholder="EXERCISE..."
                          className="flex-1 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-black dark:focus:border-white transition-all"
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                        />
                      </div>
                      <button 
                        onClick={addHabit}
                        disabled={!newHabitName.trim()}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all disabled:opacity-30 border border-zinc-200 dark:border-zinc-700"
                      >
                        Insert into Habit
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sticky Save Button */}
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-zinc-950 via-white/95 dark:via-zinc-950/95 to-transparent shrink-0">
              <button 
                onClick={() => setIsEditMode(false)}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-6 rounded-2xl text-xs font-black uppercase tracking-[0.5em] shadow-2xl active:scale-95 hover:scale-[1.01] transition-all"
              >
                Close Parameters
              </button>
            </div>
          </div>
        )}

        {/* Commitment Confirmation Modal */}
        {showCommitConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-10 space-y-8">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <ShieldCheck size={32} className="text-black dark:text-white" />
                  </div>
                </div>
                
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] dark:text-white">Habit Vow</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed px-2">
                    You are committing to a 30-day cycle of discipline starting on <span className="font-black text-black dark:text-white">{state.habitsStartDate}</span>. Historical data is preserved by default.
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => executeCommit(false)}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Commit & Start <Check size={14} />
                  </button>
                  <button 
                    onClick={() => executeCommit(true)}
                    className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                  >
                    Clean Slate & Start <RotateCcw size={14} />
                  </button>
                  <button 
                    onClick={() => setShowCommitConfirm(false)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 h-24 flex px-8 pb-4">
        <button 
          onClick={() => { setActiveTab('tracker'); setIsEditMode(false); }}
          className={`flex-1 flex flex-col items-center justify-center gap-2 transition-all ${activeTab === 'tracker' ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}
        >
          <div className={`p-2 rounded-2xl transition-all ${activeTab === 'tracker' ? 'bg-zinc-100 dark:bg-zinc-800 scale-110 shadow-sm' : ''}`}>
            <Calendar size={20} strokeWidth={activeTab === 'tracker' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Habit</span>
        </button>
        <button 
          onClick={() => { setActiveTab('stats'); setIsEditMode(false); }}
          className={`flex-1 flex flex-col items-center justify-center gap-2 transition-all ${activeTab === 'stats' ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}
        >
          <div className={`p-2 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-zinc-100 dark:bg-zinc-800 scale-110 shadow-sm' : ''}`}>
            <BarChart2 size={20} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Insights</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
