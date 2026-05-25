import React, { useState } from 'react';
import { CodeSnippet } from '../types';
import { kotlinCodeTemplates } from '../kotlinCodeTemplates';
import { generateAndroidProjectZip } from '../lib/androidProjectGenerator';

interface KotlinCodeViewerProps {
  onCopySuccess: () => void;
}

export const KotlinCodeViewer: React.FC<KotlinCodeViewerProps> = ({ onCopySuccess }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const activeSnippet = kotlinCodeTemplates[selectedFileIndex];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      onCopySuccess();
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownloadProject = async () => {
    setIsZipping(true);
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
      console.error("Failed to create ZIP", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Explanation annotations in Hinglish explaining standard Compose structures
  const getEducativeAnnotations = (fileName: string) => {
    switch (fileName) {
      case 'MainActivity.kt':
        return [
          { keyword: "remember { mutableStateOf(...) }", text: "MutableState holds dynamic data in Compose. Inputs ya total amount update hote hi design automatically naye value ke saath update (re-render) ho jata hai." },
          { keyword: "LazyColumn", text: "Classic Android Recycler/ListView ka simple modern alterative. Dynamic listing ke liye iska use karte hain aur items load karna Compose me bas kuch lines ka kaam hai!" },
          { keyword: "Card(colors = CardDefaults.cardColors(...))", text: "Material 3 style container cards. Inme components, icons, colors aur rounded-corners directly design kar sakte hain." },
          { keyword: "OutlinedTextField", text: "Modern material text input field. Placeholder, keyboard restriction settings aur visual floating borders design simple banate hain." },
        ];
      case 'Theme.kt':
        return [
          { keyword: "lightColorScheme", text: "Light modes me use hone wale background and accent colors define karne ki standard template." },
          { keyword: "isSystemInDarkTheme()", text: "Android OS dark mode settings automatically check karne ka Compose dynamic mechanism." }
        ];
      default:
        return [
          { keyword: "dependencies", text: "Gradle packages specify karte hain. Jetpack Compose compile support, material design system models, activity ktx framework elements implement karne ke liye imports." }
        ];
    }
  };

  const annotations = getEducativeAnnotations(activeSnippet.fileName);

  return (
    <div id="kotlin-code-viewer" className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 flex flex-col gap-5 h-full min-h-[600px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:max-h-[720px] overflow-hidden">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-200">Android Studio Explorer 👨‍💻</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Learn how Jetpack Compose handles this Student Expense Tracker</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Real ZIP Installer Button */}
          <button 
            onClick={handleDownloadProject}
            disabled={isZipping}
            className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <span>{isZipping ? '⚡ Generating ZIP...' : 'Download Project ZIP 📦'}</span>
          </button>

          {/* Quick Copy Action */}
          <button 
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-855 text-zinc-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>Copy File Code 📋</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* Gradle / File tree folder structure on left (30%) */}
        <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-zinc-900 pb-4 md:pb-0 md:pr-4 flex flex-col gap-2 overflow-y-auto max-h-[160px] md:max-h-none">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Project Structure</span>
          
          <div className="flex flex-col gap-1">
            {kotlinCodeTemplates.map((snippet, idx) => {
              const active = idx === selectedFileIndex;
              return (
                <button
                  key={snippet.fileName}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs border ${
                    active 
                      ? 'bg-zinc-900 border-zinc-850 text-emerald-400 font-semibold shadow-inner' 
                      : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  <span className="text-base text-zinc-500">{snippet.fileName.endsWith('.kt') ? '☕' : '⚙️'}</span>
                  <div className="flex flex-col">
                    <span className="leading-tight">{snippet.fileName}</span>
                    <span className="text-[9px] text-zinc-600 truncate max-w-[140px] md:max-w-none">{snippet.filePath}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-zinc-900/35 p-3 rounded-2xl border border-zinc-900 flex flex-col mt-auto gap-2">
            <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">🛠️ APK KAISE BANAYEIN?</span>
            <div className="text-[9.5px] text-zinc-500 space-y-1.5 leading-normal">
              <p>
                <strong className="text-zinc-350">1. Project Import:</strong> "Download Project ZIP" button daba ke file save karein aur extract karein. Android Studio me <strong className="text-zinc-350">File &gt; Open</strong> par click karke extracted folder ko select karein.
              </p>
              <p>
                <strong className="text-zinc-350">2. Gradle Sync:</strong> Wait karein jab tak build finishes sync successfully ho jaye.
              </p>
              <p>
                <strong className="text-zinc-350">3. Create APK:</strong> Android Studio ke top menu me <strong className="text-emerald-400">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> par click karein! Kucch hi seconds me aapka standalone Mobile APK file taiyaar ho jayega jise aap direct phone me install kar sakte hain!
              </p>
            </div>
          </div>
        </div>

        {/* Code Content text with simulated lines & Annotations list on right (70%) */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          
          {/* File description card */}
          <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-905 flex items-start gap-1.5 shrink-0">
            <span className="text-base">ℹ️</span>
            <div>
              <p className="text-[11px] font-medium text-emerald-400 font-mono">{activeSnippet.fileName} Description</p>
              <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">{activeSnippet.description}</p>
            </div>
          </div>

          {/* High resolution code editor with line numbers */}
          <div className="flex-1 bg-zinc-950/80 border border-zinc-900 rounded-2xl relative overflow-auto font-mono text-[11px] leading-relaxed select-text p-4 text-zinc-300">
            <pre className="overflow-x-auto whitespace-pre font-mono">
              <code>
                {activeSnippet.code}
              </code>
            </pre>
          </div>

          {/* Educational Concept Chips */}
          <div className="shrink-0 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 tracking-wider">UNDERSTAND THE KOTLIN CONCEPTS:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto">
              {annotations.map((annot, index) => (
                <div key={index} className="bg-zinc-900/40 border border-zinc-900 p-2.5 rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-bold text-emerald-400 font-mono break-all">{annot.keyword}</span>
                  <p className="text-[9.5px] text-zinc-500 leading-relaxed font-sans">{annot.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
