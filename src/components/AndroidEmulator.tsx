import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { User } from 'firebase/auth';

interface AndroidEmulatorProps {
  expenses: Expense[];
  onAddExpense: (amount: number, description: string, category: ExpenseCategory) => void;
  onDeleteExpense: (id: string, deleteCalendar: boolean) => void;
  limitType: 'DAILY' | 'MONTHLY';
  setLimitType: (type: 'DAILY' | 'MONTHLY') => void;
  budgetLimit: number;
  setBudgetLimit: (limit: number) => void;
  user: User | null;
  onLogin: () => Promise<any>;
  onLogout: () => void;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (val: boolean) => void;
  onSyncExpense: (id: string) => Promise<boolean>;
  googleToken: string | null;
  isStandaloneCleanView?: boolean;
}

export const AndroidEmulator: React.FC<AndroidEmulatorProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  limitType,
  setLimitType,
  budgetLimit,
  setBudgetLimit,
  user,
  onLogin,
  onLogout,
  autoSyncEnabled,
  setAutoSyncEnabled,
  onSyncExpense,
  googleToken,
  isStandaloneCleanView = false,
}) => {
  // Simulator operational state
  const [phoneTime, setPhoneTime] = useState<string>('12:00');
  const [batteryLevel, setBatteryLevel] = useState<number>(98);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('Food');
  const [showLimitDialog, setShowLimitDialog] = useState<boolean>(false);
  const [tempLimit, setTempLimit] = useState<string>(String(budgetLimit));
  const [tempLimitType, setTempLimitType] = useState<'DAILY' | 'MONTHLY'>(limitType);

  // Internationalization / Multilingual State
  const [lang, setLang] = useState<'HINGLISH' | 'ENGLISH'>(() => {
    const s = localStorage.getItem('APP_LANG');
    return (s === 'ENGLISH' || s === 'HINGLISH') ? s : 'HINGLISH';
  });

  const toggleLanguage = () => {
    const next = lang === 'HINGLISH' ? 'ENGLISH' : 'HINGLISH';
    setLang(next);
    localStorage.setItem('APP_LANG', next);
    triggerToast(next === 'ENGLISH' ? 'English Language Loaded! 🇬🇧' : 'Hinglish Chuni Gayi! 🇮🇳');
  };

  const t = (hinglish: string, english: string) => (lang === 'HINGLISH' ? hinglish : english);

  useEffect(() => {
    setTempLimit(String(budgetLimit));
    setTempLimitType(limitType);
  }, [budgetLimit, limitType]);
  
  // Custom notifications / Android toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Custom states for Google Calendar deletion and individual sync loading
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);

  useEffect(() => {
    // Keep device clock synchronized with current time
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setPhoneTime(`${hours}:${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      triggerToast(t('Arey! Valid amount to daalo! 😒', 'Please enter a valid amount! 😒'));
      return;
    }
    
    const finalizedDesc = descInput.trim() !== '' ? descInput.trim() : selectedCategory;
    onAddExpense(amt, finalizedDesc, selectedCategory);
    
    // Clear inputs
    setAmountInput('');
    setDescInput('');
    triggerToast(t('Kharcha save ho gaya! 💾✅', 'Expense saved successfully! 💾✅'));
  };

  const handleDeletePrompt = (item: Expense) => {
    if (item.googleEventId) {
      setExpenseToDelete(item);
    } else {
      onDeleteExpense(item.id, false);
      triggerToast(t('Kharcha delete ho gaya! ❌', 'Expense deleted! ❌'));
    }
  };

  const handleSyncSingle = async (item: Expense) => {
    setIsSyncingId(item.id);
    try {
      const success = await onSyncExpense(item.id);
      if (success) {
        triggerToast(t('Calendar me sync ho gaya! 📅✨', 'Successfully synced with Google Calendar! 📅✨'));
      } else {
        triggerToast(t('Pahle Google se link karein! 👤', 'Please link your Google account first! 👤'));
      }
    } catch (e: any) {
      triggerToast(e.message || 'Sync failed! Try again.');
    } finally {
      setIsSyncingId(null);
    }
  };

  // Calculate total depending on the selected limit type (Daily or Monthly)
  const periodTotal = expenses.reduce((sum, exp) => {
    if (limitType === 'DAILY') {
      const isToday = new Date(exp.timestamp).toDateString() === new Date().toDateString();
      return isToday ? sum + exp.amount : sum;
    } else {
      const expDate = new Date(exp.timestamp);
      const now = new Date();
      const isThisMonth = expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      return isThisMonth ? sum + exp.amount : sum;
    }
  }, 0);

  const isOverLimit = periodTotal > budgetLimit;
  const progressPercent = Math.min((periodTotal / budgetLimit) * 100, 100);

  // Status warnings in Hinglish or English
  const getBudgetStatusText = () => {
    if (periodTotal === 0) return t('Bacha Ke Rakho! Kharcha shuru nahi hua. 💰', 'Keep Saving! No expenses started yet today. 💰');
    if (periodTotal > budgetLimit) return t('⚠️ Budget khatam! Papa daantenge! Papa ko kya bologe? 😭', '⚠️ Budget exceeded! Parents will be angry! Be careful! 😭');
    if (periodTotal > budgetLimit * 0.8) return t('🚨 Danger Zone! Bus me safar karo ab! 🚌', '🚨 Danger Zone! Save money and travel by bus! 🚌');
    if (periodTotal > budgetLimit * 0.5) return t('⚠️ Aadha paisa khatam! Thoda control karo, dost! 🤔', '⚠️ Half of budget gone! Try to control expenses! 🤔');
    return t('👍 Control mein hai! Party kharch bacha hua hai! 🎉', '👍 Under control! Party budget remains! 🎉');
  };

  // Category specs
  const categoryDetails: Record<ExpenseCategory, { icon: string; label: string; color: string; bgColor: string; altLabel: string }> = {
    Food: { icon: '🍔', label: 'Food', altLabel: 'Khaana', color: 'bg-amber-400 text-amber-950', bgColor: 'bg-amber-500/10' },
    Travel: { icon: '🚗', label: 'Travel', altLabel: 'Safar', color: 'bg-sky-400 text-sky-950', bgColor: 'bg-sky-500/10' },
    Study: { icon: '📚', label: 'Study', altLabel: 'Padhai', color: 'bg-emerald-400 text-emerald-950', bgColor: 'bg-emerald-500/10' },
    Recharge: { icon: '⚡', label: 'Recharge', altLabel: 'Mobile', color: 'bg-purple-400 text-purple-950', bgColor: 'bg-purple-500/10' },
    Other: { icon: '🏷️', label: 'Other', altLabel: 'Dusre', color: 'bg-stone-400 text-stone-950', bgColor: 'bg-stone-500/10' },
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 relative select-none overflow-hidden">
      {/* Dynamic Android Toast Alert - Rendered solid for massive render speed up */}
      {toastMessage && (
        <div className="absolute left-4 right-4 bg-zinc-900 text-zinc-100 px-4 py-3 rounded-2xl text-xs font-sans text-center z-50 shadow-xl border border-zinc-800/80 top-16 duration-500 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Container Screen - Hardware Accelerated and layout optimized to fix scrolling lag/jerkiness */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col font-sans scrollbar-none relative pb-10"
        style={{ WebkitOverflowScrolling: 'touch', transform: 'translate3d(0,0,0)' }}
      >
        
        {/* APP HEADER - Full solid background with no backdrop-blur filters for maximum GPU frames during scrolling */}
        <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-900 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="pocket">🎓</span>
            <div>
              <h1 className="text-sm md:text-base font-black text-zinc-100 tracking-tight leading-none">
                {t('Kharcha Tracker', 'Kharcha Tracker')}
              </h1>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider block uppercase mt-1 leading-none">
                {t('Student budget tracker', 'Student Budget Tracker')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector Selector Button Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all text-[11px] font-bold text-zinc-300 cursor-pointer border-0 outline-none focus:outline-none focus:ring-0"
              title="Toggle Language / Bhasha badlein"
            >
              {lang === 'HINGLISH' ? '🇮🇳 Hinglish' : '🇬🇧 English'}
            </button>

            {/* Quick Settings Icon */}
            <button 
              onClick={() => {
                setTempLimit(String(budgetLimit));
                setTempLimitType(limitType);
                setShowLimitDialog(true);
              }}
              className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all text-xs cursor-pointer font-bold text-emerald-400 border-0 outline-none focus:outline-none focus:ring-0"
              title="Change Limit"
            >
              ⚙️ {t('Limit', 'Limit')}
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4">
          
          {/* "Aaj/Mahine ka kharcha" (Spending Metric Panel) */}
          <div className={`p-5 rounded-3xl transition-all shadow-md border-0 ${isOverLimit ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                {limitType === 'DAILY' 
                  ? t('AAJ KA KHARCHA 💸', "TODAY'S EXPENSE 💸") 
                  : t('IS MAHINE KA KHARCHA 💸', "THIS MONTH'S EXPENSE 💸")
                }
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-900 text-zinc-400 uppercase font-black">
                {limitType === 'DAILY' ? t('TODAY', 'TODAY') : t('MONTHLY', 'MONTHLY')}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-zinc-100">₹{periodTotal.toFixed(0)}</span>
              <span className="text-xs text-zinc-400">/ ₹{budgetLimit}</span>
            </div>

            {/* Progress Slider Mockup */}
            <div className="w-full h-2.5 bg-zinc-900 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Dynamic Warning Message */}
            <p className={`text-[11px] font-medium mt-2 leading-relaxed ${isOverLimit ? 'text-red-400' : 'text-emerald-400'}`}>
              {getBudgetStatusText()}
            </p>
          </div>

          {/* GOOGLE CALENDAR SYNC PANEL */}
          {!user ? (
            <div className="p-4 bg-zinc-900/30 rounded-3xl flex flex-col gap-2.5 border-0 shadow-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">📅</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">
                    {t('Google Calendar Sync 🌐', 'Google Calendar Sync 🌐')}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                    {t(
                      'Bachat and spendings details ko direct Google Calendar per automatic sync karein!',
                      'Automatically sync your savings and budget details directly to your Google Calendar!'
                    )}
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={onLogin}
                className="w-full h-10 pointer-events-auto bg-zinc-90 hover:bg-zinc-900/60 transition-all border-0 rounded-full flex items-center justify-center gap-2 px-4 cursor-pointer outline-none focus:outline-none focus:ring-0"
              >
                <div className="w-4 h-4 shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="text-[11px] font-black text-zinc-200">
                  {t('Connect Google Calendar', 'Connect Google Calendar')}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-950/20 rounded-3xl flex flex-col gap-3 animate-fade-in border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[70%]">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-7 h-7 rounded-full border border-emerald-500/25 shadow-inner" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-emerald-800 text-emerald-100 rounded-full flex items-center justify-center text-xs font-bold font-mono">
                      {(user.displayName || user.email || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-zinc-100 truncate">{user.displayName || user.email}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">
                      {t('Synced Live ✅', 'Synced Live ✅')}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950/30 border-0 text-[10px] font-bold text-zinc-400 hover:text-red-400 active:scale-95 transition-all text-center cursor-pointer outline-none focus:outline-none focus:ring-0"
                >
                  {t('Disconnect', 'Disconnect')}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-300">
                    {t('Save hone par automatic sync', 'Auto-sync upon saving')}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {t('Expenses direct calendar me save honge', 'Expenses will save directly to your calendar')}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                    autoSyncEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                      autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* EXPENSE ENTRY FORM - Cleaned inputs and button focus ring styles completely */}
          <form onSubmit={handleSaveExpense} className="p-5 bg-zinc-900/30 rounded-3xl flex flex-col gap-3 shadow-md border-0">
            <h3 className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              {t('Naya Kharcha Daalo 📝', 'Add New Expense 📝')}
            </h3>
            
            {/* Amount daalo Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 font-medium">
                {t('Amount daalo (₹) *', 'Enter Amount (₹) *')}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                <input 
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={t('Jaise: 120', 'e.g., 120')}
                  className="w-full bg-zinc-900/60 focus:bg-zinc-900 focus:ring-1 focus:ring-emerald-500/50 rounded-xl py-2.5 px-10 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all text-left border-0 outline-none outline-transparent ring-0"
                  tabIndex={1}
                />
              </div>
            </div>

            {/* Description Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 font-medium">
                {t('Kahan kharch kiya? (Optional)', 'Where did you spend? (Optional)')}
              </label>
              <input 
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder={t('Jaise: Samosa party, Auto fare', 'e.g., Samosa party, Auto fare')}
                className="w-full bg-zinc-900/60 focus:bg-zinc-900 focus:ring-1 focus:ring-emerald-500/50 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none transition-all border-0 outline-none outline-transparent ring-0"
                tabIndex={2}
              />
            </div>

            {/* Category selector chips grid */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 font-medium">
                {t('Category select karo:', 'Select Category:')}
              </label>
              <div id="emulator-categories-grid" className="grid grid-cols-5 gap-1.5 mt-1">
                {(['Food', 'Travel', 'Study', 'Recharge', 'Other'] as ExpenseCategory[]).map((cat) => {
                  const sel = selectedCategory === cat;
                  const details = categoryDetails[cat];
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-bold transition-all border-0 outline-none focus:outline-none focus:ring-0 cursor-pointer ${
                        sel 
                          ? `${details.color} scale-102 shadow-md shadow-emerald-500/10` 
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400'
                      }`}
                    >
                      <span className="text-base mb-1" role="img" aria-label={cat}>{details.icon}</span>
                      {t(details.altLabel, details.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Expense Button - Outlines, borders, indicators removed entirely */}
            <button 
              type="submit"
              className="w-full h-11 pointer-events-auto bg-emerald-500 hover:bg-emerald-600 active:scale-97 text-zinc-950 font-black rounded-full text-xs transition-all flex items-center justify-center gap-1 shadow-lg mt-2 cursor-pointer border-0 outline-none outline-transparent focus:outline-none focus:ring-0 focus:ring-offset-0"
            >
              <span>{t('Save Expense 💾', 'Save Expense 💾')}</span>
            </button>
          </form>

          {/* RECENT EXPENSES LIST */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-zinc-400 tracking-wider">
                {t('RECENT KHARCHAS 📝', 'RECENT EXPENSES 📝')}
              </h3>
            </div>

            {expenses.length === 0 ? (
              <div id="emulator-empty-state" className="py-12 bg-zinc-900/10 rounded-3xl border-0 flex flex-col items-center justify-center text-center p-6 gap-2">
                <span className="text-3xl">🎉</span>
                <h4 className="text-xs font-bold text-zinc-300">
                  {t('Koi kharcha nahi hai!', 'No expenses yet!')}
                </h4>
                <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
                  {t(
                    'Sahi hai yaar, aaj ek rupaye ki bhi bachat ho rahi hai. Add button daba ke kharch karo!',
                    'Great! Not a single rupee has been spent yet today. Save up!'
                  )}
                </p>
              </div>
            ) : (
              <div id="emulator-recent-list" className="flex flex-col gap-2">
                {expenses.map((item) => {
                  const details = categoryDetails[item.category];
                  const expTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={item.id}
                      className="p-3 px-4 bg-zinc-900/30 rounded-2xl flex items-center justify-between hover:bg-zinc-900/50 transition-all hover:translate-x-0.5 duration-200 shadow-sm border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${details.bgColor}`}>
                          {details.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-200 leading-snug truncate">{item.description}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-zinc-500 shrink-0">
                              {t(details.altLabel, item.category)} • {expTime}
                            </span>
                            {item.googleEventId ? (
                              <span className="text-[8.5px] bg-emerald-500/10 border-0 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 shrink-0">
                                {t('📅 Synced', '📅 Synced')}
                              </span>
                            ) : user ? (
                              <button
                                type="button"
                                disabled={isSyncingId === item.id}
                                onClick={() => handleSyncSingle(item)}
                                className="text-[8.5px] bg-zinc-900 hover:bg-emerald-500/10 hover:text-emerald-400 text-zinc-500 px-1 py-0.2 rounded font-bold transition-all flex items-center gap-0.5 whitespace-nowrap active:scale-95 cursor-pointer shrink-0 border-0 outline-none focus:outline-none"
                              >
                                {isSyncingId === item.id ? t('⚡ Syncing...', '⚡ Syncing...') : t('📅 Sync Now', '📅 Sync Now')}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-400">₹{item.amount}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(item)}
                          className="p-1 text-zinc-500 hover:text-red-400 active:scale-95 text-xs rounded-full cursor-pointer border-0 outline-none focus:outline-none"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* DYNAMIC SETTINGS MODAL BACKDROP */}
        {showLimitDialog && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full max-w-[280px] bg-zinc-950 border border-zinc-900 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <div className="text-center">
                <span className="text-2xl">⚙️</span>
                <h4 className="font-bold text-zinc-200 text-sm mt-1">
                  {t('Budget Setup ⚙️', 'Budget Setup ⚙️')}
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {t('Apna limit aur period set karein.', 'Set your limit and period.')}
                </p>
              </div>

              {/* Period Select Toggle Options */}
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-850">
                <button
                  type="button"
                  onClick={() => {
                    setTempLimitType('DAILY');
                    if (tempLimit === '15005' || tempLimit === '15000') setTempLimit('500');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer border-0 outline-none ${
                    tempLimitType === 'DAILY'
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 bg-transparent'
                  }`}
                >
                  {t('Daily ☀️', 'Daily ☀️')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempLimitType('MONTHLY');
                    if (tempLimit === '500') setTempLimit('15000');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer border-0 outline-none ${
                    tempLimitType === 'MONTHLY'
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 bg-transparent'
                  }`}
                >
                  {t('Monthly 🌙', 'Monthly 🌙')}
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-zinc-400">
                  {t('Budget Limit (₹)', 'Budget Limit (₹)')}
                </label>
                <input
                  type="number"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  className="w-full bg-zinc-900/80 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-emerald-500 text-left border-0 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLimitDialog(false)}
                  className="py-2.5 rounded-xl bg-zinc-900 text-[11px] font-bold text-zinc-400 hover:bg-zinc-850 active:scale-95 transition-all text-center cursor-pointer border-0 outline-none"
                >
                  {t('Cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const num = parseFloat(tempLimit);
                    if (!isNaN(num) && num > 0) {
                      setLimitType(tempLimitType);
                      setBudgetLimit(num);
                      setShowLimitDialog(false);
                      triggerToast(t(`Budget updated: ₹${num} (${tempLimitType})! 👍`, `Budget updated: ₹${num} (${tempLimitType})! 👍`));
                    } else {
                      triggerToast(t('Arey sahi amount set karo! 😒', 'Please enter a valid amount! 😒'));
                    }
                  }}
                  className="py-2.5 rounded-xl bg-emerald-500 text-[11px] font-bold text-zinc-950 hover:bg-emerald-600 active:scale-95 transition-all text-center cursor-pointer border-0 outline-none"
                >
                  {t('Save Limit', 'Save Limit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DYNAMIC CALENDAR DELETE CONFIRMATION MODAL */}
        {expenseToDelete && (
          <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full max-w-[290px] bg-zinc-950 border border-red-950/20 p-5 rounded-[28px] flex flex-col gap-4 shadow-xl">
              <div className="text-center">
                <span className="text-3xl">📅🗑️</span>
                <h4 className="font-bold text-zinc-200 text-sm mt-1.5 leading-tight">
                  {t('Calendar se bhi delete karein?', 'Also delete from Calendar?')}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-normal px-2">
                  {t(
                    'Aapka yeh expense Google Calendar me already sync ho chuka hai. Kya aap use bhi calendar se delete karna chahte hain?',
                    'This expense has been synced to your Google Calendar. Would you like to unlink and delete it from Google Calendar too?'
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteExpense(expenseToDelete.id, true);
                    setExpenseToDelete(null);
                    triggerToast(t('All done! Calendar aur app dono se saaf! 🗑️✅', 'Done! Removed from both calendar and app! 🗑️✅'));
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-[11px] font-bold text-zinc-950 text-center cursor-pointer border-0 outline-none"
                >
                  {t('Yes, Delete From Both 🗑️', 'Yes, Delete From Both 🗑️')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteExpense(expenseToDelete.id, false);
                    setExpenseToDelete(null);
                    triggerToast(t('App se nikaala, Calendar me chhod diya! 👍', 'Removed check from app, kept calendar entry! 👍'));
                  }}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 active:scale-95 transition-all text-[11px] font-bold text-zinc-300 text-center cursor-pointer outline-none"
                >
                  {t('No, Only App se delete karein', 'No, Delete only from App')}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="w-full py-2 bg-transparent text-[10.5px] font-bold text-zinc-500 hover:text-zinc-400 text-center cursor-pointer border-0 outline-none"
                >
                  {t('Cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
