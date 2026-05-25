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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to load saved expenses", e);
      }
    }
    // Starts at exactly zero! No pre-populated expenses.
    return [];
  });

  const [limitType, setLimitType] = useState<'DAILY' | 'MONTHLY'>(() => {
    const saved = localStorage.getItem('STUDENT_LIMIT_TYPE');
    return saved === 'MONTHLY' ? 'MONTHLY' : 'DAILY';
  });

  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const saved = localStorage.getItem('STUDENT_BUDGET_LIMIT');
    if (saved) return parseFloat(saved);
    const savedType = localStorage.getItem('STUDENT_LIMIT_TYPE');
    return savedType === 'MONTHLY' ? 15000 : 500;
  });

  // Google Calendar Integration states
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('GOOGLE_CALENDAR_AUTO_SYNC');
    return saved ? saved === 'true' : true;
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
    localStorage.setItem('STUDENT_LIMIT_TYPE', limitType);
  }, [limitType]);

  useEffect(() => {
    localStorage.setItem('STUDENT_BUDGET_LIMIT', String(budgetLimit));
  }, [budgetLimit]);

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
    <div className="h-screen w-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col items-center justify-center overflow-hidden antialiased p-0 md:p-4">
      {/* CORE ACTIVE CUSTOMER LIVE MOBILE VIEW */}
      <div className="w-full max-w-md h-full flex flex-col justify-stretch animate-fade-in">
        <AndroidEmulator
          expenses={expenses}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          limitType={limitType}
          setLimitType={setLimitType}
          budgetLimit={budgetLimit}
          setBudgetLimit={setBudgetLimit}
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
    </div>
  );
}
