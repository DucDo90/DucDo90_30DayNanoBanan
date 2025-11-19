import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TranslationFunction } from '../types';
import { Language, languages } from '../utils/translations';

interface AuthScreenProps {
  t: TranslationFunction;
  theme?: string;
  toggleTheme?: () => void;
  currentLang: Language;
  setLang: (lang: Language) => void;
}

type AuthMode = 'signin' | 'signup' | 'phone';

export const AuthScreen: React.FC<AuthScreenProps> = ({ t, theme, toggleTheme, currentLang, setLang }) => {
  const { login, register, googleLogin, phoneLogin, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);

  // Language Menu State
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
            setIsLangOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode); 
    clearError(); 
    setShowOtp(false); 
    setOtp('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') await login(email, password);
    else if (mode === 'signup') await register(name, email, password);
    else if (mode === 'phone') {
      if (!showOtp) { 
          // Simulate OTP sent
          setShowOtp(true); 
          alert(`Mock OTP: 123456`); 
      } 
      else if (otp === '123456') {
          await phoneLogin(phone); 
      } else {
          alert('Invalid OTP');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050505] p-4 relative overflow-hidden font-sans transition-colors duration-500">
       {/* Dynamic Background */}
       <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/20 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/20 rounded-full blur-[120px] animate-float" style={{animationDelay: '4s'}}></div>
       </div>

       {/* Top Right Controls */}
       <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
          {/* Language Selector */}
          <div className="relative" ref={langMenuRef}>
             <button 
               onClick={() => setIsLangOpen(!isLangOpen)} 
               className="p-3 flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all backdrop-blur-md shadow-sm border border-slate-200 dark:border-slate-700"
             >
                <span className="text-lg leading-none">{languages.find(l => l.id === currentLang)?.flag}</span>
                <svg className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
             </button>

             {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-1.5">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => { setLang(lang.id); setIsLangOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${currentLang === lang.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
             )}
          </div>

          {toggleTheme && (
            <button onClick={toggleTheme} className="p-3 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all backdrop-blur-md shadow-sm border border-slate-200 dark:border-slate-700">
               {theme === 'dark' ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
          )}
       </div>

       <div className="w-full max-w-md glass-panel rounded-[2.5rem] shadow-2xl relative z-10 p-8 md:p-10 animate-fade-in border border-white/40 dark:border-white/10">
         <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5 transform rotate-3 hover:rotate-6 transition-transform duration-500">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{mode === 'signup' ? t('auth.welcome_new') : t('auth.welcome')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">{t('auth.subtitle')}</p>
         </div>

         {/* Auth Mode Tabs (only for email flow) */}
         {mode !== 'phone' && (
             <div className="flex p-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700/50 relative">
                {['signin', 'signup'].map((m) => (
                  <button 
                    key={m} 
                    onClick={() => handleModeSwitch(m as AuthMode)} 
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${mode === m ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {t(`auth.${m}`)}
                  </button>
                ))}
             </div>
         )}

         {/* Error Display */}
         {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t(error)}
         </div>}

         <form onSubmit={handleSubmit} className="space-y-5">
             {/* Name Input (Signup only) */}
             {mode === 'signup' && (
               <div className="group animate-in slide-in-from-bottom-2">
                 <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder={t('auth.placeholder_name')} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all font-medium" />
               </div>
             )}
             
             {/* Email Flow Inputs */}
             {mode !== 'phone' ? (
               <>
                 <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t('auth.placeholder_email')} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all font-medium" />
                 <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all font-medium" />
               </>
             ) : (
               /* Phone Flow Inputs */
               <div className="space-y-4 animate-in slide-in-from-right-4">
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number (e.g. 555-1234)" disabled={showOtp} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all font-medium disabled:opacity-60" />
                  {showOtp && (
                    <div className="relative">
                        <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" maxLength={6} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-4 text-sm text-center tracking-[0.5em] font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all animate-in slide-in-from-top-2" />
                        <p className="text-xs text-center mt-2 text-slate-400">Enter the code sent to your device</p>
                    </div>
                  )}
               </div>
             )}

             <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
               {isLoading ? (
                 <span className="flex items-center justify-center gap-2">
                   <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Processing...
                 </span>
               ) : (mode === 'signin' ? t('auth.signin') : mode === 'signup' ? t('auth.signup') : showOtp ? t('auth.verify') : t('auth.send_code'))}
             </button>
         </form>
         
         {/* Social / Alternative Login Section */}
         <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-white dark:bg-[#10131a] px-3 text-slate-400">{t('auth.or')}</span></div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <button 
              type="button" 
              onClick={googleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm hover:shadow group disabled:opacity-50"
            >
               <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Google</span>
            </button>
            
            <button 
               type="button" 
               onClick={() => handleModeSwitch(mode === 'phone' ? 'signin' : 'phone')} 
               disabled={isLoading}
               className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-xl transition-colors shadow-sm hover:shadow group disabled:opacity-50 ${mode === 'phone' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
               {mode === 'phone' ? (
                  <>
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Use Email</span>
                  </>
               ) : (
                  <>
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Phone</span>
                  </>
               )}
            </button>
         </div>

         <div className="mt-8 text-center">
             <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                By signing in, you agree to our <a href="#" className="text-indigo-500 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-500 hover:underline">Privacy Policy</a>.
             </div>
         </div>
       </div>
    </div>
  );
};