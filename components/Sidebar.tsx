import React from 'react';
import { TranslationFunction } from '../types';

export type InputMode = 'upload' | 'prompt' | 'analyze' | 'edit' | 'video' | 'chat' | 'live';

interface SidebarProps {
  currentMode: InputMode;
  setMode: (mode: InputMode) => void;
  t: TranslationFunction;
  isProcessing: boolean;
}

const menuItems: { id: InputMode; icon: React.ReactElement }[] = [
  { 
    id: 'upload', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
  { 
    id: 'prompt', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  },
  { 
    id: 'analyze', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
  },
  { 
    id: 'edit', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  },
  { 
    id: 'video', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
  },
  { 
    id: 'chat', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
  },
  { 
    id: 'live', 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, t, isProcessing }) => {
  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-72 h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/50 z-30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
      <div className="p-8 flex items-center justify-center lg:justify-start gap-4">
        <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-sm opacity-60"></div>
            <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner border border-white/20">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
        </div>
        <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            30DayNanoBanana
            </h1>
            <span className="text-[10px] font-semibold text-indigo-500 tracking-widest uppercase">Pro Studio</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
           const isActive = currentMode === item.id;
           return (
             <button
                key={item.id}
                onClick={() => !isProcessing && setMode(item.id)}
                disabled={isProcessing}
                className={`
                  w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group relative
                  ${isActive 
                    ? 'bg-indigo-600/10 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                  ${isProcessing ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                `}
             >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                )}
                
                <span className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`}>
                   {item.icon}
                </span>
                <span className={`hidden lg:block font-semibold text-sm tracking-wide truncate ${isActive ? 'font-bold' : ''}`}>
                    {t(`mode.${item.id}`)}
                </span>
                
                {/* Tooltip for collapsed state */}
                <div className="lg:hidden absolute left-full ml-6 px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap shadow-xl translate-x-2 group-hover:translate-x-0">
                  {t(`mode.${item.id}`)}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-white"></div>
                </div>
             </button>
           );
        })}
      </nav>

      <div className="p-6 border-t border-slate-200 dark:border-slate-800/50">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 hidden lg:block border border-slate-100 dark:border-slate-700/50">
           <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-3">{t('footer.text')}</p>
           <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-[85%] rounded-full animate-[pulse_3s_ease-in-out_infinite]" />
           </div>
        </div>
      </div>
    </aside>
  );
};