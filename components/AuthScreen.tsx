
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TranslationFunction } from '../types';

interface AuthScreenProps {
  t: TranslationFunction;
  theme?: string;
  toggleTheme?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'phone';

export const AuthScreen: React.FC<AuthScreenProps> = ({ t, theme, toggleTheme }) => {
  const { login, register, googleLogin, phoneLogin, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setShowOtp(false);
    setOtp('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      await login(email, password);
    } else if (mode === 'signup') {
      await register(name, email, password);
    } else if (mode === 'phone') {
      if (!showOtp) {
        // Simulate sending OTP
        setShowOtp(true);
        alert(`Mock OTP for ${phone}: 123456`);
      } else {
        if (otp === '123456') {
          await phoneLogin(phone);
        } else {
           alert('Invalid OTP (Use 123456)');
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
       {/* Background Effects */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
       </div>
       
       {/* Theme Toggle Absolute Position for Auth Screen */}
       {toggleTheme && (
        <button 
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors z-20"
        >
           {theme === 'dark' ? (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
           ) : (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
           )}
        </button>
       )}

       <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fade-scale transition-colors duration-300">
         
         {/* Header */}
         <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {mode === 'signup' ? t('auth.welcome_new') : t('auth.welcome')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{t('auth.subtitle')}</p>
         </div>

         {/* Tabs */}
         <div className="flex px-8 border-b border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => handleModeSwitch('signin')}
              className={`flex-1 pb-4 text-sm font-medium transition-all relative ${mode === 'signin' || mode === 'phone' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t('auth.signin')}
              {(mode === 'signin' || mode === 'phone') && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
            </button>
            <button 
               onClick={() => handleModeSwitch('signup')}
               className={`flex-1 pb-4 text-sm font-medium transition-all relative ${mode === 'signup' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t('auth.signup')}
              {mode === 'signup' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
            </button>
         </div>

         {/* Form Body */}
         <div className="p-8">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {t(error)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
               {mode === 'signup' && (
                 <div>
                   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{t('auth.name')}</label>
                   <input 
                     type="text" 
                     required 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder={t('auth.placeholder_name')}
                     className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                   />
                 </div>
               )}

               {mode !== 'phone' ? (
                 <>
                   <div>
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{t('auth.email')}</label>
                     <input 
                       type="email" 
                       required 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder={t('auth.placeholder_email')}
                       className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{t('auth.password')}</label>
                     <input 
                       type="password" 
                       required 
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                     />
                   </div>
                 </>
               ) : (
                 <>
                    <div>
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{t('auth.phone')}</label>
                     <div className="flex gap-2">
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                           <span>+84</span>
                        </div>
                        <input 
                          type="tel" 
                          required 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="90 123 4567"
                          className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                     </div>
                   </div>
                   {showOtp && (
                     <div className="animate-in fade-in slide-in-from-top-2">
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{t('auth.otp')}</label>
                       <input 
                         type="text" 
                         required 
                         value={otp}
                         onChange={(e) => setOtp(e.target.value)}
                         placeholder="123456"
                         maxLength={6}
                         className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-center tracking-widest font-mono text-lg"
                       />
                     </div>
                   )}
                 </>
               )}

               {mode === 'signin' && (
                 <div className="flex justify-end">
                   <button type="button" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                     {t('auth.forgot_pass')}
                   </button>
                 </div>
               )}

               <button 
                 type="submit" 
                 disabled={isLoading}
                 className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
               >
                 {isLoading && (
                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                 )}
                 {mode === 'signin' ? t('auth.signin') : mode === 'signup' ? t('auth.signup') : showOtp ? t('auth.verify') : t('auth.send_code')}
               </button>
            </form>

            <div className="my-6 flex items-center gap-4">
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
               <span className="text-xs text-slate-400 dark:text-slate-500">{t('auth.or')}</span>
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={googleLogin}
                className="flex items-center justify-center gap-2 bg-white dark:bg-white text-slate-900 hover:bg-slate-100 font-medium py-2.5 rounded-xl transition-colors border border-slate-200 dark:border-transparent"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"/>
                   <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853"/>
                   <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.51649C-0.18551 10.0056 -0.18551 14.0004 1.51649 17.3912L5.50253 14.3003Z" fill="#FBBC05"/>
                   <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.0344664 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50264 9.70575C6.45064 6.86173 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335"/>
                </svg>
                <span className="hidden sm:inline">{t('auth.continue_google')}</span>
                <span className="sm:hidden">Google</span>
              </button>
              
              <button 
                type="button"
                onClick={() => handleModeSwitch(mode === 'phone' ? 'signin' : 'phone')}
                className={`flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 ${mode === 'phone' ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="hidden sm:inline">{t('auth.continue_phone')}</span>
                <span className="sm:hidden">Phone</span>
              </button>
            </div>
         </div>
       </div>
    </div>
  );
};
