import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, ExpenseCategory } from './types';
import { AndroidEmulator } from './components/AndroidEmulator';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './lib/firebaseAuth';
import { createCalendarEvent, deleteCalendarEvent } from './lib/calendarService';
import { generateAndroidProjectZip } from './lib/androidProjectGenerator';

export default function App() {
  const [isZippingHeader, setIsZippingHeader] = useState<boolean>(false);
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

  // Google Calendar Integration states
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('GOOGLE_CALENDAR_AUTO_SYNC');
    return saved ? saved === 'true' : true;
  });

  // View mode to toggle between clean native-like App View vs robust Android dev workspace
  const [viewMode, setViewMode] = useState<'STUDENT_APP' | 'DEVELOPER_PORTAL'>(() => {
    const isMobileSize = typeof window !== 'undefined' && window.innerWidth < 1024;
    const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    return (isMobileSize || isStandalone) ? 'STUDENT_APP' : 'DEVELOPER_PORTAL';
  });

  // Client layout helpers
  const [activeTab, setActiveTab] = useState<'APP' | 'CODE'>('APP');
  const [showCopyAlert, setShowCopyAlert] = useState<boolean>(false);

  // PWA Install Prompt state & alerts
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallStatusMsg("Installation started! Kharcha tracker dashboard home screen par add ho raha hai! 🎉");
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Installation flow error:", err);
      }
    } else {
      // Show elegant guide instead of alert
      setInstallStatusMsg("Chrome Browser me right side up '3 Dots' par click karke 'Install app' ya 'Add to Home screen' select karein! 📲✨");
    }
    setTimeout(() => {
      setInstallStatusMsg(null);
    }, 6000);
  };

  // Synchronize dynamic modifications to standard storage
  useEffect(() => {
    localStorage.setItem('STUDENT_EXPENSES', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('STUDENT_DAILY_LIMIT', String(dailyLimit));
  }, [dailyLimit]);

  useEffect(() => {
    localStorage.setItem('GOOGLE_CALENDAR_AUTO_SYNC', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Handle Firebase Authentication state listener integration
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setGoogleToken(token);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async (): Promise<string | null> => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setGoogleToken(result.accessToken);
        return result.accessToken;
      }
    } catch (err) {
      console.error("Google authentication failed", err);
    }
    return null;
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setGoogleToken(null);
    } catch (err) {
      console.error("Google disconnect logout failed", err);
    }
  };

  const handleSyncExpense = async (id: string): Promise<boolean> => {
    let currentToken = googleToken;
    if (!currentToken) {
      currentToken = await handleLogin();
      if (!currentToken) return false;
    }

    const expenseItem = expenses.find((exp) => exp.id === id);
    if (!expenseItem || expenseItem.googleEventId) {
      return false;
    }

    try {
      const eventId = await createCalendarEvent(currentToken, expenseItem);
      setExpenses((prev) => prev.map((item) => 
        item.id === id 
          ? { ...item, googleEventId: eventId, syncedAt: Date.now() } 
          : item
      ));
      return true;
    } catch (err) {
      console.error("Failed to sync expense item:", err);
      throw err;
    }
  };

  const handleAddExpense = async (amount: number, description: string, category: ExpenseCategory) => {
    const localId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      id: localId,
      amount,
      description,
      category,
      timestamp: Date.now(),
    };
    
    // Write entry to state instantaneously so UI operates fast
    setExpenses((prev) => [newExpense, ...prev]);

    // Send to Google Calendar automatically if configured and synchronized
    if (googleToken && autoSyncEnabled) {
      try {
        const eventId = await createCalendarEvent(googleToken, newExpense);
        setExpenses((prev) => prev.map((item) => 
          item.id === localId 
            ? { ...item, googleEventId: eventId, syncedAt: Date.now() } 
            : item
        ));
      } catch (err) {
        console.error("Auto calendar synchronization failed", err);
      }
    }
  };

  const handleDeleteExpense = async (id: string, deleteCalendar: boolean) => {
    const target = expenses.find((item) => item.id === id);
    
    // Filter item from list first
    setExpenses((prev) => prev.filter((item) => item.id !== id));

    // Cancel calendar event if required
    if (deleteCalendar && target?.googleEventId && googleToken) {
      try {
        await deleteCalendarEvent(googleToken, target.googleEventId);
      } catch (err) {
        console.error("Calendar event removal failed", err);
      }
    }
  };

  const handleHeaderZipDownload = async () => {
    setIsZippingHeader(true);
    try {
      const blob = await generateAndroidProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StudentExpenseTracker_AndroidProject.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to compile ZIP", err);
    } finally {
      setIsZippingHeader(false);
    }
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
        {installStatusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-zinc-950 px-6 py-3.5 rounded-full font-black text-xs z-50 tracking-wide shadow-2xl flex items-center justify-center gap-2 max-w-[90vw] text-center"
          >
            <span>{installStatusMsg}</span>
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
          
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Elegant Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-full border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('STUDENT_APP')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                  viewMode === 'STUDENT_APP'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md scale-102'
                    : 'text-zinc-400 hover:text-zinc-100 bg-transparent'
                }`}
              >
                📲 Live App Only
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DEVELOPER_PORTAL')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                  viewMode === 'DEVELOPER_PORTAL'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md scale-102'
                    : 'text-zinc-400 hover:text-zinc-100 bg-transparent'
                }`}
              >
                💻 Developer View
              </button>
            </div>

            {/* Direct header level downloader - only shown in developer context */}
            {viewMode === 'DEVELOPER_PORTAL' && (
              <button
                onClick={handleHeaderZipDownload}
                disabled={isZippingHeader}
                className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <span>{isZippingHeader ? '⚡ Generating ZIP...' : 'Download Android Studio ZIP 📦'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-full border border-zinc-850">
              <span className="text-xs px-3 py-1 font-bold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/15">
                Live Interactive Prototype
              </span>
              <span className="text-xs font-mono text-zinc-500 pr-3">
                Jetpack Compose v1.5.1
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">

        {viewMode === 'STUDENT_APP' ? (
          <div className="w-full flex-1 max-w-md mx-auto py-2 animate-fade-in">
            <AndroidEmulator
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              dailyLimit={dailyLimit}
              setDailyLimit={setDailyLimit}
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              autoSyncEnabled={autoSyncEnabled}
              setAutoSyncEnabled={setAutoSyncEnabled}
              onSyncExpense={handleSyncExpense}
              googleToken={googleToken}
              isStandaloneCleanView={true}
            />
          </div>
        ) : (
          <>
            {/* COMPREHENSIVE PHONE INSTALLATION CARD */}
            <div className="p-6 bg-zinc-900/40 rounded-3xl border border-zinc-850/80 flex flex-col gap-5 animate-fade-in shadow-xl">
              <div className="flex items-start gap-3.5">
                <span className="text-3xl shrink-0">📱</span>
                <div>
                  <h2 className="text-sm font-black text-zinc-100 tracking-tight">Apne Phone me Kaise Install Karein? / How to Run on Your Device 🚀</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    Is app ko do bade tareeqon se phone par chalaya ja sakta hai. Choose the method that suits your academic or daily usage:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* METHOD 1: INSTANT WEB APP */}
                <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800/60 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5 text-zinc-300">
                    <span className="text-xs font-black text-emerald-400 block tracking-wider uppercase">Option A: Instant Install Web-App (Recommended) ⚡</span>
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
                      Yeh preview mobile-responsive hai aur direct browser se offline standalone app ban jata hai:
                    </p>
                    <div className="space-y-1 pl-1 text-[10px] text-zinc-500 leading-relaxed">
                      <p>1. Apne Android phone ke browser (Google Chrome) me niche diya link open karein:</p>
                      <p className="my-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-300 font-mono select-all text-center break-all">
                        https://ais-pre-z77qpj3i5wcbcghrt5c3ql-241545421829.asia-southeast1.run.app
                      </p>
                      <p>2. Chrome me top right par <strong className="text-zinc-320">"3 dots (Menu)"</strong> icon dabaein.</p>
                      <p>3. <strong className="text-emerald-400">"Install app"</strong> ya <strong className="text-emerald-400">"Add to Home Screen"</strong> par click karein.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleInstallPWA}
                      className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-xl shadow-md"
                    >
                      📥 {deferredPrompt ? 'Direct Phone me Install Karein' : 'Easy Install on Android 📲'}
                    </button>
                    <a 
                      href="https://ais-pre-z77qpj3i5wcbcghrt5c3ql-241545421829.asia-southeast1.run.app"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-8.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-zinc-700 text-center flex items-center justify-center text-[10px] font-bold text-zinc-350 hover:text-zinc-200 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-98"
                    >
                      Open Direct Link inside Mobile Browser 🌐
                    </a>
                  </div>
                </div>

                {/* METHOD 2: BUILD NATIVE APK */}
                <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800/60 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5 text-zinc-300">
                    <span className="text-xs font-black text-emerald-400 block tracking-wider uppercase">Option B: Generate Real Android APK (.apk) 📦</span>
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
                      Agar aapko standard package file install karna hai to source code build karein:
                    </p>
                    <div className="space-y-1 pl-1 text-[10px] text-zinc-500 leading-relaxed pb-1">
                      <p>1. Niche standard tabs me se <strong className="text-zinc-320">"Kotlin Code Project"</strong> par switch karein.</p>
                      <p>2. Green color ke <strong className="text-emerald-400">"Download Project ZIP"</strong> button par click karein.</p>
                      <p>3. ZIP ko save aur extract karke <strong className="text-zinc-320">Android Studio</strong> me open karein.</p>
                      <p>4. Android Studio editor me <strong className="text-emerald-400">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> click karein tab real package banega!</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveTab('CODE');
                      // Quick scroll helper
                      const codeViewer = document.getElementById('kotlin-code-viewer');
                      if (codeViewer) {
                        codeViewer.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full h-8.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-center flex items-center justify-center text-[10px] font-black rounded-xl transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    Go to Project Downloader ⬇️
                  </button>
                </div>

              </div>
            </div>
            
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
                  user={user}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                  autoSyncEnabled={autoSyncEnabled}
                  setAutoSyncEnabled={setAutoSyncEnabled}
                  onSyncExpense={handleSyncExpense}
                  googleToken={googleToken}
                  isStandaloneCleanView={false}
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
          </>
        )}

      </main>

      {/* CORE FRAMEWORK FOOTER */}
      <footer className="py-6 border-t border-zinc-900 text-center text-zinc-600 text-[11px] font-mono shrink-0 mt-auto bg-zinc-950">
        <div>STUDENT EXPENSE TRACKER • KOTLIN + COMPOSABLE FRAMEWORK MOCKUP FOR ACADEMIC CODING</div>
      </footer>
    </div>
  );
}
