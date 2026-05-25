import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, ExpenseCategory } from './types';
import { AndroidEmulator } from './components/AndroidEmulator';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';

export default function App() {
  // Persistence with LocalStorage
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('STUDENT_EXPENSES');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved expenses", e);
      }
    }
    // Return Indian Student starter expenses as high quality starter mockup
    return [
      {
        id: 'start-1',
        amount: 239,
        description: 'Monthly Mobile Recharge ⚡',
        category: 'Recharge',
        timestamp: Date.now() - 3600000 * 2, // 2 hours ago
      },
      {
        id: 'start-2',
        amount: 110,
        description: 'Semester Exam Notebook 📚',
        category: 'Study',
        timestamp: Date.now() - 3600000 * 4, // 4 hours ago
      },
      {
        id: 'start-3',
        amount: 50,
        description: 'Samosa + Chai with Friends 🍔',
        category: 'Food',
        timestamp: Date.now() - 3600000 * 6, // 6 hours ago
      },
      {
        id: 'start-4',
        amount: 30,
        description: 'Auto fare to College 🚗',
        category: 'Travel',
        timestamp: Date.now() - 3600000 * 8, // 8 hours ago
      }
    ];
  });

  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = localStorage.getItem('STUDENT_DAILY_LIMIT');
    return saved ? parseFloat(saved) : 500; // Default 500 Rupees
  });

  // Client layout helpers
  const [activeTab, setActiveTab] = useState<'APP' | 'CODE'>('APP');
  const [showCopyAlert, setShowCopyAlert] = useState<boolean>(false);

  // Synchronize dynamic modifications to standard storage
  useEffect(() => {
    localStorage.setItem('STUDENT_EXPENSES', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('STUDENT_DAILY_LIMIT', String(dailyLimit));
  }, [dailyLimit]);

  const handleAddExpense = (amount: number, description: string, category: ExpenseCategory) => {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      amount,
      description,
      category,
      timestamp: Date.now(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopyAlert = () => {
    setShowCopyAlert(true);
    setTimeout(() => setShowCopyAlert(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col antialiased">
      {/* Dynamic Copy Success Notification */}
      <AnimatePresence>
        {showCopyAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-full font-black text-xs z-50 tracking-wider shadow-xl flex items-center gap-2"
          >
            <span>📋 FILE CODE COPIED SUCCESSFULLY! NOW PASTE IN YOUR ANDROID STUDIO PROJECT.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL BANNER HEADER */}
      <header className="px-6 py-6 md:py-8 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label="student app">🎓</span>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight">
                  Student Expense Tracker
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Android App Project Built with Kotlin + Jetpack Compose UI
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-full border border-zinc-850 self-start md:self-auto">
            <span className="text-xs px-3 py-1 font-bold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/15">
              Live Interactive Prototype
            </span>
            <span className="text-xs font-mono text-zinc-500 pr-3">
              Jetpack Compose v1.5.1
            </span>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
        
        {/* RESPONSIVE MOBILE SELECTOR TABS (Only visible below 900px breakpoint) */}
        <div id="mobile-viewport-selector" className="lg:hidden flex bg-zinc-900/80 p-1 rounded-2xl border border-zinc-850">
          <button
            onClick={() => setActiveTab('APP')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'APP' 
                ? 'bg-emerald-500 text-zinc-950 shadow-md' 
                : 'bg-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>📱 Mobile App Emulator</span>
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'CODE' 
                ? 'bg-emerald-500 text-zinc-950 shadow-md' 
                : 'bg-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>👨‍💻 Kotlin Code Project</span>
          </button>
        </div>

        {/* COMBINED INTERACTIVE DUAL DISPLAY (Desktop: Side-by-Side | Mobile: Tab Controlled) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Android Emulator Block */}
          <div className={`lg:col-span-5 flex justify-center ${activeTab === 'APP' ? 'block' : 'hidden lg:block'}`}>
            <AndroidEmulator
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              dailyLimit={dailyLimit}
              setDailyLimit={setDailyLimit}
            />
          </div>

          {/* RIGHT: Kotlin Project Code Files Block */}
          <div className={`lg:col-span-7 h-full ${activeTab === 'CODE' ? 'block' : 'hidden lg:block'}`}>
            <KotlinCodeViewer onCopySuccess={handleCopyAlert} />
          </div>

        </div>

        {/* DESIGN FOOTER GUIDELINES */}
        <section className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider">
              Student Guide: Hinglish Labels & Jetpack Compose Best Practices
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11.5px] text-zinc-500 leading-relaxed font-sans">
            <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-905">
              <span className="font-bold text-zinc-300">"Aaj ka kharcha" Container</span>
              <p>
                Student apps must relate in their language! Using labels like "Aaj ka kharcha" makes technology less complex and friendlier for fresh Android students in India.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-905">
              <span className="font-bold text-zinc-300">Single Source of State</span>
              <p>
                In Jetpack Compose, UI elements depend purely on State. Our code uses standard mutable state arrays to keep dynamic input data synchronized without manual list adapter resets.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-905">
              <span className="font-bold text-zinc-300">Material 3 Modern Styling</span>
              <p>
                Built on top of fully compliant Android Material Design 3 tokens. Standardizes card heights, safe paddings, and fully rounded-pills shape buttons according to modern design guidance.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* CORE FRAMEWORK FOOTER */}
      <footer className="py-6 border-t border-zinc-900 text-center text-zinc-600 text-[11px] font-mono shrink-0 mt-auto bg-zinc-950">
        <div>STUDENT EXPENSE TRACKER • KOTLIN + COMPOSABLE FRAMEWORK MOCKUP FOR ACADEMIC CODING</div>
      </footer>
    </div>
  );
}
