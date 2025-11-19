import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, InputMode } from './components/Sidebar'; 
import { UploadZone } from './components/UploadZone';
import { GeneratedGrid } from './components/GeneratedGrid';
import { GeneratedView, TARGET_ANGLES, FileUpload, AspectRatio, ASPECT_RATIOS, ImageQuality, QUALITY_OPTIONS, ImageFilter, FILTER_OPTIONS, ChatMessage } from './types';
import { generateAngleImage, upscaleImage, generateReferenceImage, analyzeImage, editImage, generateVideo, sendChatMessage, resetChatSession, startLiveSession, stopLiveSession } from './services/geminiService';
import { translations, Language, languages } from './utils/translations';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';

// Helper to rotate image data URL
const rotateImage = (base64Str: string, direction: 'clockwise' | 'counterclockwise'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(direction === 'clockwise' ? 90 * Math.PI / 180 : -90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL());
    };
    img.onerror = (err) => reject(err);
    img.src = base64Str;
  });
};

type LiveStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

const App: React.FC = () => {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  
  // Core State
  const [upload, setUpload] = useState<FileUpload | null>(null);
  const [generatedViews, setGeneratedViews] = useState<GeneratedView[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [quality, setQuality] = useState<ImageQuality>('medium');
  
  // Language State
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_lang');
      if (saved && languages.some(l => l.id === saved)) {
        return saved as Language;
      }
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', currentLang);
  }, [currentLang]);

  // Language Dropdown State
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
  
  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Feature Specific States
  const [prompt, setPrompt] = useState('');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);

  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const t = (key: string) => translations[currentLang][key] || translations['en'][key] || key;

  // Scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auth Check
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen t={t} theme={theme} toggleTheme={toggleTheme} currentLang={currentLang} setLang={setCurrentLang} />;
  }

  // Handlers
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUpload({ file, previewUrl: base64, base64: base64, mimeType: file.type });
      
      // When uploading in specific modes, don't clear everything immediately
      if (inputMode === 'upload') {
        setGeneratedViews([]);
        setSelectedIds([]);
        setIsSelectionMode(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const setInputModeAndClear = (mode: InputMode) => {
      if (inputMode === 'live' && mode !== 'live') {
          stopLiveSession();
          setLiveStatus('idle');
      }
      setInputMode(mode);
      setAnalysisResult('');
      setGeneratedVideoUrl(null);
      
      // Reset view specific data if switching major contexts
      if (mode === 'upload' || mode === 'prompt') {
         setGeneratedViews([]); 
      }
  };

  const handleGenerateReference = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingRef(true);
    setUpload(null);
    setGeneratedViews([]);
    try {
      const result = await generateReferenceImage(prompt, aspectRatio);
      const file = new File([new Blob([result.url])], "generated-ref.png", { type: result.mimeType });
      setUpload({ file, previewUrl: result.url, base64: result.url, mimeType: result.mimeType });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const handleGenerate = async () => {
    if (!upload) return;
    setIsProcessing(true);
    setSelectedIds([]);
    setIsSelectionMode(false);

    const initialStates: GeneratedView[] = TARGET_ANGLES.map(angle => ({
      id: angle.id,
      angleName: angle.name,
      imageUrl: null,
      isLoading: true,
      error: null,
      filter: 'none',
      filterIntensity: 100
    }));
    setGeneratedViews(initialStates);

    await Promise.all(TARGET_ANGLES.map(async (angle) => {
      try {
        const imageUrl = await generateAngleImage(upload.base64, upload.mimeType, angle.name, aspectRatio, quality);
        setGeneratedViews(prev => prev.map(view => view.id === angle.id ? { ...view, imageUrl, isLoading: false } : view));
      } catch (error) {
        setGeneratedViews(prev => prev.map(view => view.id === angle.id ? { ...view, error: "Failed", isLoading: false } : view));
      }
    }));
    setIsProcessing(false);
  };

  const handleAnalyze = async () => {
     if(!upload) return; setIsAnalyzing(true);
     try { const res = await analyzeImage(upload.base64, upload.mimeType, analysisPrompt || "Describe this"); setAnalysisResult(res); } 
     catch(e) { setAnalysisResult("Error"); } finally { setIsAnalyzing(false); }
  };

  const handleEdit = async () => {
      if(!upload) return; setIsEditing(true); setGeneratedViews([]);
      try { const url = await editImage(upload.base64, upload.mimeType, editPrompt || "Enhance"); 
      setGeneratedViews([{ id: 'edit', angleName: 'edit', imageUrl: url, isLoading: false, error: null, filter: 'none', filterIntensity: 100 }]); } 
      catch(e) { console.error(e); } finally { setIsEditing(false); }
  };

  const handleGenerateVideo = async () => {
      if(!videoPrompt.trim() && !upload) return; 
      setIsGeneratingVideo(true); 
      setGeneratedVideoUrl(null);
      try { 
        const url = await generateVideo(videoPrompt, aspectRatio, upload?.base64, upload?.mimeType); 
        setGeneratedVideoUrl(url); 
      } catch(e: any) { 
        console.error(e);
        alert(e.message || "Video generation failed"); 
      } finally { 
        setIsGeneratingVideo(false); 
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault(); if(!chatInput.trim()) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: Date.now() };
      setChatMessages(p => [...p, userMsg]); setChatInput(''); setIsChatLoading(true);
      try { const res = await sendChatMessage(userMsg.text); 
      setChatMessages(p => [...p, { id: (Date.now()+1).toString(), role: 'model', text: res, timestamp: Date.now() }]); } 
      catch(e) { console.error(e); } finally { setIsChatLoading(false); }
  };

  const handleRotate = async (targetId: string, dir: 'clockwise' | 'counterclockwise') => {
      const targets = selectedIds.includes(targetId) && selectedIds.length > 0 ? selectedIds : [targetId];
      setGeneratedViews(p => p.map(v => targets.includes(v.id) ? {...v, isLoading: true} : v));
      const updates = await Promise.all(targets.map(async id => {
          const v = generatedViews.find(i => i.id === id);
          if(!v?.imageUrl) return {id, url: null};
          return { id, url: await rotateImage(v.imageUrl, dir) };
      }));
      setGeneratedViews(p => p.map(v => { const u = updates.find(up => up.id === v.id); return u?.url ? {...v, isLoading: false, imageUrl: u.url} : v; }));
  };

  const handleUpscale = async (id: string) => {
      const v = generatedViews.find(i => i.id === id); if(!v?.imageUrl) return;
      setGeneratedViews(p => p.map(x => x.id === id ? {...x, isUpscaling: true} : x));
      try { const url = await upscaleImage(v.imageUrl, 'image/png'); 
      setGeneratedViews(p => p.map(x => x.id === id ? {...x, isUpscaling: false, imageUrl: url} : x)); } 
      catch(e) { setGeneratedViews(p => p.map(x => x.id === id ? {...x, isUpscaling: false} : x)); }
  };

  const toggleLiveSession = () => {
      if (liveStatus === 'connected' || liveStatus === 'connecting') { stopLiveSession(); setLiveStatus('idle'); }
      else { setLiveStatus('connecting'); startLiveSession((s) => setLiveStatus(s as LiveStatus)); }
  };

  const handleFilterSelect = (fid: ImageFilter) => {
      if(isSelectionMode && selectedIds.length === 0) return;
      const opt = FILTER_OPTIONS.find(f => f.id === fid);
      setGeneratedViews(p => p.map(v => (!isSelectionMode || selectedIds.includes(v.id)) ? {...v, filter: fid, filterIntensity: opt?.defaultValue || 100} : v));
  };

  const handleDownloadAll = async () => {
    const targets = selectedIds.length > 0 
       ? generatedViews.filter(v => selectedIds.includes(v.id) && v.imageUrl)
       : generatedViews.filter(v => v.imageUrl);
    if (targets.length === 0) return;
    for (const view of targets) {
      if (view.imageUrl) {
        const link = document.createElement('a');
        link.href = view.imageUrl;
        link.download = `nanobanana-${view.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-200 transition-colors duration-500 font-sans">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-500/5 rounded-full blur-[150px] animate-float"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-500/5 rounded-full blur-[150px] animate-float" style={{animationDelay: '5s'}}></div>
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        currentMode={inputMode} 
        setMode={setInputModeAndClear} 
        t={t}
        isProcessing={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 z-20 shrink-0 transition-all duration-300">
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize flex items-center gap-2">
               {t(`mode.${inputMode}`)}
               {isProcessing && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"/>}
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block">AI Powered Creative Studio</p>
           </div>
           
           <div className="flex items-center gap-5">
             {/* Language Selector */}
             <div className="relative" ref={langMenuRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
                >
                   <span className="text-xl leading-none">{languages.find(l => l.id === currentLang)?.flag}</span>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase hidden sm:block">{currentLang}</span>
                   <svg className={`w-3 h-3 text-slate-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {isLangOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1.5">
                      {languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => { setCurrentLang(lang.id); setIsLangOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === lang.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span>{lang.label}</span>
                          {currentLang === lang.id && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>

             {/* Profile */}
             <div className="flex items-center gap-4 pl-6 border-l border-slate-200 dark:border-slate-800/50">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user.name}</p>
                  <button onClick={logout} className="text-[10px] font-semibold text-red-500 hover:text-red-600 uppercase tracking-wider mt-1">{t('auth.logout')}</button>
                </div>
                <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-md object-cover" />
             </div>
             
             {/* Theme Toggle */}
             <button onClick={toggleTheme} className="p-2.5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all shadow-sm border border-slate-200 dark:border-slate-700">
               {theme === 'dark' ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
             </button>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin bg-gradient-to-b from-transparent to-white/5 dark:to-black/20">
          <div className="max-w-[1600px] mx-auto space-y-8">
            
            {/* Conditional Inputs based on Mode */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
               
               {/* Left Column: Input/Config */}
               <div className={`xl:col-span-4 space-y-6 ${inputMode === 'chat' || inputMode === 'live' ? 'hidden' : ''}`}>
                  
                  {/* Mode: Upload, Analyze, Edit, Video (Requires Upload) */}
                  {(inputMode === 'upload' || inputMode === 'analyze' || inputMode === 'edit' || inputMode === 'video') && (
                    <div className="glass-panel rounded-[2rem] p-2 transition-all duration-300 hover:shadow-lg">
                       <UploadZone 
                          onFileSelect={processFile} 
                          currentPreview={upload?.previewUrl || null} 
                          isGenerating={isProcessing} 
                          t={t} 
                       />
                       {inputMode === 'video' && upload && (
                         <button onClick={() => setUpload(null)} className="w-full py-3 text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-2 uppercase tracking-wider">Remove Image</button>
                       )}
                    </div>
                  )}

                  {/* Mode: Prompt */}
                  {inputMode === 'prompt' && (
                    <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t('prompt.placeholder')}</label>
                          <textarea 
                            value={prompt} onChange={e => setPrompt(e.target.value)} 
                            className="w-full h-48 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none transition-all focus:bg-white dark:focus:bg-black/40"
                            placeholder="E.g. A futuristic robot playing chess..."
                          />
                      </div>
                      <button 
                        onClick={handleGenerateReference}
                        disabled={isGeneratingRef || !prompt.trim()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 transform active:scale-[0.98]"
                      >
                        {isGeneratingRef ? t('prompt.generating') : t('prompt.btn')}
                      </button>
                    </div>
                  )}

                  {/* Controls: Aspect & Quality (Only for Upload/Prompt) */}
                  {(inputMode === 'upload' || inputMode === 'prompt') && (
                     <div className="glass-panel rounded-[2rem] p-8 space-y-8">
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">{t('label.aspect_ratio')}</label>
                           <div className="grid grid-cols-2 gap-3">
                              {ASPECT_RATIOS.map(r => (
                                 <button key={r.id} onClick={() => setAspectRatio(r.id)} className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${aspectRatio === r.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{t(`ratio.${r.id}`)}</button>
                              ))}
                           </div>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">{t('label.quality')}</label>
                           <div className="grid grid-cols-3 gap-3">
                              {QUALITY_OPTIONS.map(q => (
                                 <button key={q.id} onClick={() => setQuality(q.id)} className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${quality === q.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{t(`quality.${q.id}`)}</button>
                              ))}
                           </div>
                        </div>
                        
                        <button 
                          onClick={handleGenerate}
                          disabled={!upload || isProcessing}
                          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                           {isProcessing ? (
                               <span className="flex items-center justify-center gap-3">
                                   <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                   {t('btn.generating')}
                               </span>
                           ) : t('btn.generate')}
                        </button>
                     </div>
                  )}

                  {/* Input: Analyze */}
                  {inputMode === 'analyze' && (
                     <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                        <textarea value={analysisPrompt} onChange={e => setAnalysisPrompt(e.target.value)} placeholder={t('analyze.placeholder')} className="w-full h-40 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none resize-none" />
                        <button onClick={handleAnalyze} disabled={isAnalyzing || !upload} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">{isAnalyzing ? t('analyze.loading') : t('analyze.btn')}</button>
                     </div>
                  )}

                   {/* Input: Edit */}
                   {inputMode === 'edit' && (
                     <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                        <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder={t('edit.placeholder')} className="w-full h-40 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none resize-none" />
                        <button onClick={handleEdit} disabled={isEditing || !upload} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50">{isEditing ? t('edit.loading') : t('edit.btn')}</button>
                     </div>
                  )}

                   {/* Input: Video */}
                   {inputMode === 'video' && (
                     <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                        <textarea value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder={t('video.placeholder')} className="w-full h-40 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500/50 outline-none resize-none" />
                        <div className="flex gap-3">
                           {['16:9', '9:16'].map(r => (
                              <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${aspectRatio === r ? 'bg-red-600 border-red-600 text-white shadow-md' : 'border-transparent bg-slate-100 dark:bg-slate-800/50 text-slate-500'}`}>{r}</button>
                           ))}
                        </div>
                        <button onClick={handleGenerateVideo} disabled={isGeneratingVideo || (!upload && !videoPrompt)} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50">{isGeneratingVideo ? t('video.loading') : t('video.btn')}</button>
                     </div>
                  )}

               </div>

               {/* Right Column: Results / Chat / Live */}
               <div className={`xl:col-span-8 ${inputMode === 'chat' || inputMode === 'live' ? 'xl:col-span-12' : ''}`}>
                  
                  {/* Empty State */}
                  {generatedViews.length === 0 && !analysisResult && !generatedVideoUrl && inputMode !== 'chat' && inputMode !== 'live' && (
                     <div className="h-full flex flex-col items-center justify-center opacity-40 min-h-[400px]">
                        <div className="w-32 h-32 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p className="text-xl font-medium text-slate-500 dark:text-slate-400">Ready to create something amazing?</p>
                        <p className="text-sm text-slate-400 dark:text-slate-600 mt-2">Upload an image or enter a prompt to start.</p>
                     </div>
                  )}

                  {/* Generated Grid */}
                  {generatedViews.length > 0 && (
                     <div className="space-y-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                           <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                               <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                               {t('lightbox.output')}
                           </h3>
                           <div className="flex gap-3 bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-2xl backdrop-blur-sm border border-white/20">
                              {/* Filters */}
                              <div className="hidden xl:flex gap-1 mr-2">
                                 {FILTER_OPTIONS.map(f => (
                                    <button key={f.id} onClick={() => handleFilterSelect(f.id)} className={`px-4 py-2 text-xs rounded-xl transition-all ${generatedViews[0]?.filter === f.id ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{t(`filter.${f.id}`)}</button>
                                 ))}
                              </div>
                              
                              <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isSelectionMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                 {isSelectionMode ? t('btn.exit_select') : t('btn.select_mode')}
                              </button>
                              <button onClick={handleDownloadAll} className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                                 {t('btn.save_all')}
                              </button>
                           </div>
                        </div>
                        <GeneratedGrid 
                           items={generatedViews} selectedIds={selectedIds} isSelectionMode={isSelectionMode}
                           onToggleSelection={id => setSelectedIds(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])}
                           onSelectAll={() => setSelectedIds(generatedViews.map(v => v.id))} onDeselectAll={() => setSelectedIds([])}
                           onRotate={handleRotate} onUpdateView={(id, u) => setGeneratedViews(p => p.map(v => v.id === id ? {...v, ...u} : v))}
                           onUpscale={handleUpscale} onBatchUpscale={() => selectedIds.forEach(id => handleUpscale(id))}
                           originalImage={upload?.previewUrl || null} t={t}
                        />
                     </div>
                  )}

                  {/* Analyze Result */}
                  {analysisResult && (
                     <div className="glass-panel rounded-[2rem] p-10 animate-in fade-in slide-in-from-bottom-8 border-l-4 border-l-purple-500">
                        <h3 className="text-2xl font-bold text-purple-500 mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            {t('analyze.result')}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-lg">{analysisResult}</p>
                     </div>
                  )}

                  {/* Video Result */}
                  {generatedVideoUrl && (
                     <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 p-8">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-slate-700 bg-black w-full max-w-4xl relative group">
                           <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-auto" />
                        </div>
                        <a href={generatedVideoUrl} download="video.mp4" className="mt-8 px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg shadow-lg shadow-red-500/40 transition-all transform hover:-translate-y-1">{t('video.download')}</a>
                     </div>
                  )}

                  {/* Chat Interface */}
                  {inputMode === 'chat' && (
                     <div className="h-full max-h-[85vh] flex flex-col glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="flex-1 overflow-y-auto p-8 space-y-8" ref={chatContainerRef}>
                           {chatMessages.length === 0 && (
                              <div className="h-full flex items-center justify-center text-slate-400">
                                 <div className="text-center">
                                    <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                                       <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <p className="text-lg font-medium">{t('chat.welcome')}</p>
                                 </div>
                              </div>
                           )}
                           {chatMessages.map(msg => (
                              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[75%] p-5 rounded-3xl text-base leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'}`}>
                                    {msg.text}
                                 </div>
                              </div>
                           ))}
                           {isChatLoading && (
                              <div className="flex justify-start">
                                 <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl rounded-bl-sm shadow-sm flex gap-2">
                                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" />
                                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                                 </div>
                              </div>
                           )}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-6 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex gap-4 backdrop-blur-md">
                           <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t('chat.placeholder')} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-6 py-4 border-none focus:ring-2 focus:ring-blue-500/50 text-base outline-none" />
                           <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                        </form>
                     </div>
                  )}

                  {/* Live Interface */}
                  {inputMode === 'live' && (
                     <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                        <div className="relative group">
                           {liveStatus === 'connected' && (
                              <>
                                 <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20 blur-2xl scale-150"></div>
                                 <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse opacity-30 blur-xl scale-125"></div>
                              </>
                           )}
                           <button 
                              onClick={toggleLiveSession}
                              disabled={liveStatus === 'connecting'}
                              className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-8 border-white/10 backdrop-blur-md ${liveStatus === 'connected' ? 'bg-green-500 hover:bg-red-500 shadow-green-500/50' : liveStatus === 'connecting' ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:scale-105 shadow-indigo-500/50'}`}
                           >
                              {liveStatus === 'connecting' ? (
                                 <svg className="w-16 h-16 text-white/50 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                 <svg className="w-20 h-20 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {liveStatus === 'connected' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
                                 </svg>
                              )}
                           </button>
                        </div>
                        <h3 className="mt-12 text-4xl font-bold text-slate-800 dark:text-white tracking-tight">{liveStatus === 'connected' ? t('live.status.connected') : liveStatus === 'connecting' ? t('live.status.connecting') : t('live.status.idle')}</h3>
                        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">{t('live.subtitle')}</p>
                     </div>
                  )}

               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;