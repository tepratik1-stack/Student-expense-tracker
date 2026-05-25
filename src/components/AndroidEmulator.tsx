import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '../types';

interface AndroidEmulatorProps {
  expenses: Expense[];
  onAddExpense: (amount: number, description: string, category: ExpenseCategory) => void;
  onDeleteExpense: (id: string) => void;
  dailyLimit: number;
  setDailyLimit: (limit: number) => void;
}

export const AndroidEmulator: React.FC<AndroidEmulatorProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  dailyLimit,
  setDailyLimit,
}) => {
  // Simulator operational state
  const [phoneTime, setPhoneTime] = useState<string>('12:00');
  const [batteryLevel, setBatteryLevel] = useState<number>(98);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('Food');
  const [showLimitDialog, setShowLimitDialog] = useState<boolean>(false);
  const [tempLimit, setTempLimit] = useState<string>(String(dailyLimit));
  
  // Custom notifications / Android toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      triggerToast('Arey! Valid amount to daalo! 😒');
      return;
    }
    
    const finalizedDesc = descInput.trim() !== '' ? descInput.trim() : selectedCategory;
    onAddExpense(amt, finalizedDesc, selectedCategory);
    
    // Clear inputs
    setAmountInput('');
    setDescInput('');
    triggerToast('Kharcha save ho gaya! 💾✅');
  };

  // Filter today's expenses
  const todayTotal = expenses.reduce((sum, exp) => {
    const isToday = new Date(exp.timestamp).toDateString() === new Date().toDateString();
    return isToday ? sum + exp.amount : sum;
  }, 0);

  const isOverLimit = todayTotal > dailyLimit;
  const progressPercent = Math.min((todayTotal / dailyLimit) * 100, 100);

  // Status warnings in Hinglish
  const getBudgetStatusText = () => {
    if (todayTotal === 0) return 'Bacha Ke Rakho! Kharcha shuru nahi hua. 💰';
    if (todayTotal > dailyLimit) return '⚠️ Budget khatam! Papa daantenge! Papa ko kya bologe? 😭';
    if (todayTotal > dailyLimit * 0.8) return '🚨 Danger Zone! Bus me safar karo ab! 🚌';
    if (todayTotal > dailyLimit * 0.5) return '⚠️ Aadha paisa khatam! Thoda control karo, dost! 🤔';
    return '👍 Control mein hai! Party kharch bacha hua hai! 🎉';
  };

  // Category specs
  const categoryDetails: Record<ExpenseCategory, { icon: string; label: string; color: string; bgColor: string }> = {
    Food: { icon: '🍔', label: 'Food', color: 'bg-amber-400 text-amber-950', bgColor: 'bg-amber-500/10 border-amber-500/20' },
    Travel: { icon: '🚗', label: 'Travel', color: 'bg-sky-400 text-sky-950', bgColor: 'bg-sky-500/10 border-sky-500/20' },
    Study: { icon: '📚', label: 'Study', color: 'bg-emerald-400 text-emerald-950', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
    Recharge: { icon: '⚡', label: 'Recharge', color: 'bg-purple-400 text-purple-950', bgColor: 'bg-purple-500/10 border-purple-500/20' },
    Other: { icon: '🏷️', label: 'Other', color: 'bg-stone-400 text-stone-950', bgColor: 'bg-stone-500/10 border-stone-500/20' },
  };

  return (
    <div id="android-emulator-container" className="flex flex-col items-center justify-center p-4">
      {/* Phone Case Frame */}
      <div className="relative w-full max-w-[375px] h-[760px] bg-zinc-900 rounded-[48px] border-4 border-zinc-800 shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden select-none">
        
        {/* Dynamic Island / Speaker */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-16 h-1 bg-zinc-800 rounded-full" />
          <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full ml-4 border border-zinc-700" />
        </div>

        {/* Dynamic Android Toast Alert */}
        {toastMessage && (
          <div className="absolute top-20 left-4 right-4 bg-zinc-850/95 backdrop-blur-md text-zinc-100 px-4 py-3 rounded-2xl text-xs font-sans text-center z-50 shadow-lg border border-zinc-700/50 animate-bounce duration-500">
            {toastMessage}
          </div>
        )}

        {/* STATUS BAR */}
        <div className="pt-9 px-6 pb-2 bg-zinc-950 flex items-center justify-between text-[11px] font-medium text-zinc-300 z-40 shrink-0">
          <div>{phoneTime}</div>
          <div className="flex items-center gap-2">
            <span>📡 5G</span>
            <span>📶 VoLTE</span>
            <span>🔋 {batteryLevel}%</span>
          </div>
        </div>

        {/* Android Display Window Screen */}
        <div className="flex-1 bg-neutral-900 text-zinc-100 overflow-y-auto overflow-x-hidden flex flex-col font-sans scrollbar-none relative pb-10">
          
          {/* APP HEADER */}
          <div className="px-4 py-3 bg-emerald-900/40 border-b border-emerald-900/20 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <div>
                <h1 className="text-sm font-semibold text-emerald-100 leading-none">Student Expense Tracker</h1>
                <span className="text-[10px] text-emerald-400 font-mono tracking-wide uppercase">Jetpack Compose Layout</span>
              </div>
            </div>
            {/* Quick Settings Icon */}
            <button 
              onClick={() => {
                setTempLimit(String(dailyLimit));
                setShowLimitDialog(true);
              }}
              className="p-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all text-xs"
              title="Change Limit"
            >
              ⚙️ Limit
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            
            {/* "Aaj ka kharcha" (Today's Spending Metric Panel) */}
            <div className={`p-4 rounded-3xl border transition-all ${isOverLimit ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-zinc-400 tracking-wider">AAJ KA KHARCHA 💸</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400">TODAY</span>
              </div>
              
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-zinc-100">₹{todayTotal.toFixed(0)}</span>
                <span className="text-xs text-zinc-400">/ ₹{dailyLimit}</span>
              </div>

              {/* Progress Slider Mockup */}
              <div className="w-full h-2.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
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

            {/* EXPENSE ENTRY FORM */}
            <form onSubmit={handleSaveExpense} className="p-4 bg-zinc-950/80 rounded-3xl border border-zinc-800 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Naya Kharcha Daalo 📝</h3>
              
              {/* Amount daalo Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 font-medium">Amount daalo (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                  <input 
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Jaise: 120"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-10 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-all text-left"
                    tabIndex={1}
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 font-medium">Kahan kharch kiya? (Optional)</label>
                <input 
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Jaise: Samosa party, Auto fare"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
                  tabIndex={2}
                />
              </div>

              {/* Category selector chips grid */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-400 font-medium">Category select karo:</label>
                <div id="emulator-categories-grid" className="grid grid-cols-5 gap-1.5 mt-1">
                  {(['Food', 'Travel', 'Study', 'Recharge', 'Other'] as ExpenseCategory[]).map((cat) => {
                    const sel = selectedCategory === cat;
                    const details = categoryDetails[cat];
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all ${
                          sel 
                            ? `${details.color} border-current scale-102 shadow-md shadow-emerald-500/10` 
                            : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-850 text-zinc-400'
                        }`}
                      >
                        <span className="text-base mb-1" role="img" aria-label={cat}>{details.icon}</span>
                        {details.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Expense Button */}
              <button 
                type="submit"
                className="w-full h-11 pointer-events-auto bg-emerald-500 hover:bg-emerald-600 active:scale-97 text-zinc-950 font-black rounded-full text-xs transition-all flex items-center justify-center gap-1 shadow-lg mt-2 cursor-pointer"
              >
                <span>Save Expense 💾</span>
              </button>
            </form>

            {/* RECENT EXPENSES LIST */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-zinc-400 tracking-wider">RECENT KHARCHAS 📝</h3>
                <span className="text-[9px] text-zinc-500 font-mono italic">Swipe to delete in phone code</span>
              </div>

              {expenses.length === 0 ? (
                <div id="emulator-empty-state" className="py-12 bg-zinc-950/40 rounded-3xl border border-zinc-800/50 flex flex-col items-center justify-center text-center p-6 gap-2">
                  <span className="text-3xl">🎉</span>
                  <h4 className="text-xs font-bold text-zinc-300">Koi kharcha nahi hai!</h4>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
                    Sahi hai yaar, aaj ek rupaye ki bhi bachat ho rahi hai. Add button daba ke kharch karo!
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
                        className="p-3 bg-zinc-950 rounded-2xl border border-zinc-850 flex items-center justify-between hover:border-zinc-700 transition-all hover:translate-x-0.5 duration-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${details.bgColor}`}>
                            {details.icon}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-200 leading-snug">{item.description}</h4>
                            <span className="text-[9px] text-zinc-500">
                              {item.category} • {expTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold text-emerald-400">₹{item.amount}</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(item.id);
                              triggerToast('Kharcha delete ho gaya! ❌');
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400 active:scale-95 text-xs rounded-full"
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
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-[280px] bg-zinc-950 border border-zinc-800 p-5 rounded-3xl flex flex-col gap-4">
                <div className="text-center">
                  <span className="text-2xl">⚙️</span>
                  <h4 className="font-bold text-zinc-200 text-sm mt-1">Daily Limit Badlo</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">Aaj ke kharche ke liye budget set karo.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-zinc-400">Budget Limit (₹)</label>
                  <input
                    type="number"
                    value={tempLimit}
                    onChange={(e) => setTempLimit(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-805 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowLimitDialog(false)}
                    className="py-2.5 rounded-xl bg-zinc-900 border border-zinc-805 text-[11px] font-bold text-zinc-400 hover:bg-zinc-850 active:scale-95 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseFloat(tempLimit);
                      if (!isNaN(num) && num > 0) {
                        setDailyLimit(num);
                        setShowLimitDialog(false);
                        triggerToast(`Budget limit updated to ₹${num}! 👍`);
                      } else {
                        triggerToast('Arey sahi amount set karo! 😒');
                      }
                    }}
                    className="py-2.5 rounded-xl bg-emerald-500 text-[11px] font-bold text-zinc-950 hover:bg-emerald-600 active:scale-95 transition-all text-center"
                  >
                    Save Limit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM SIMULATED HOME BAR KEY */}
          <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-zinc-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};
