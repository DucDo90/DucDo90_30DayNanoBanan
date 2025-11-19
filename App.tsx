
import React, { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { GeneratedGrid } from './components/GeneratedGrid';
import { GeneratedView, TARGET_ANGLES, FileUpload, AspectRatio, ASPECT_RATIOS, ImageQuality, QUALITY_OPTIONS, ImageFilter, FILTER_OPTIONS } from './types';
import { generateAngleImage, upscaleImage, generateReferenceImage, analyzeImage, editImage, generateVideo } from './services/geminiService';
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
      
      // Swap dimensions for 90 degree rotation
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

type InputMode = 'upload' | 'prompt' | 'analyze' | 'edit' | 'video';

const App: React.FC = () => {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [upload, setUpload] = useState<FileUpload | null>(null);
  const [generatedViews, setGeneratedViews] = useState<GeneratedView[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [quality, setQuality] = useState<ImageQuality>('medium');
  const [currentLang, setCurrentLang] = useState<Language>('en');
  
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
  
  // New states for Prompt Generation, Analysis, Edit & Video
  const [inputMode, setInputMode] = useState<InputMode>('video');
  const [prompt, setPrompt] = useState('');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);

  // Analysis States
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Edit States
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Video States
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  // Translation Helper
  const t = (key: string) => translations[currentLang][key] || translations['en'][key] || key;

  // Selection state for batch actions
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // If auth loading, show nothing or spinner (handled by auth context logic mostly, but good to safeguard)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, show Auth Screen
  if (!user) {
    return <AuthScreen t={t} theme={theme} toggleTheme={toggleTheme} />;
  }

  // Convert file to Base64
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUpload({
        file,
        previewUrl: base64,
        base64: base64,
        mimeType: file.type,
      });
      // Reset previous results when new file is uploaded, unless in video mode where we keep image
      if (inputMode !== 'video') {
          setGeneratedViews([]);
          setSelectedIds([]);
          setIsSelectionMode(false);
          setAnalysisResult('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      const next = !prev;
      if (!next) setSelectedIds([]); // Clear selection when exiting mode
      return next;
    });
  };

  const handleSelectionToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(existingId => existingId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(generatedViews.map(v => v.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleFilterSelect = (filterId: ImageFilter) => {
    if (isSelectionMode && selectedIds.length === 0) {
       return;
    }

    const option = FILTER_OPTIONS.find(f => f.id === filterId);
    const newIntensity = option && option.defaultValue !== undefined ? option.defaultValue : 100;

    setGeneratedViews(prev => prev.map(view => {
      const shouldUpdate = !isSelectionMode || selectedIds.includes(view.id);
      return shouldUpdate 
        ? { ...view, filter: filterId, filterIntensity: newIntensity }
        : view;
    }));
  };

  const handleGenerateReference = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingRef(true);
    setUpload(null);
    setGeneratedViews([]);
    setAnalysisResult('');
    
    try {
      const result = await generateReferenceImage(prompt, aspectRatio);
      // Create a mock File object (optional, but good for type consistency if needed elsewhere)
      const file = new File([new Blob([result.url])], "generated-ref.png", { type: result.mimeType });
      
      setUpload({
        file, // Mock file
        previewUrl: result.url,
        base64: result.url,
        mimeType: result.mimeType
      });
    } catch (error) {
      console.error("Failed to generate reference:", error);
      alert("Failed to generate reference image. Please try again.");
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const handleAnalyze = async () => {
    if (!upload) return;
    setIsAnalyzing(true);
    setAnalysisResult('');
    
    try {
      // Default prompt if empty
      const finalPrompt = analysisPrompt.trim() || "Describe this image in detail.";
      const result = await analyzeImage(upload.base64, upload.mimeType, finalPrompt);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Failed to analyze:", error);
      setAnalysisResult("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEdit = async () => {
      if (!upload) return;
      setIsEditing(true);
      setSelectedIds([]);
      setIsSelectionMode(false);
      // Prepare placeholder view
      setGeneratedViews([{
          id: 'edit',
          angleName: 'edit', // key for translation
          imageUrl: null,
          isLoading: true,
          error: null,
          filter: 'none',
          filterIntensity: 100
      }]);

      try {
          const promptText = editPrompt.trim() || "Enhance this image.";
          const imageUrl = await editImage(upload.base64, upload.mimeType, promptText);
          setGeneratedViews([{
              id: 'edit',
              angleName: 'edit',
              imageUrl,
              isLoading: false,
              error: null,
              filter: 'none',
              filterIntensity: 100
          }]);
      } catch (e) {
          console.error("Edit failed", e);
          setGeneratedViews([{
              id: 'edit',
              angleName: 'edit',
              imageUrl: null,
              isLoading: false,
              error: "Failed to edit image",
              filter: 'none',
              filterIntensity: 100
          }]);
      } finally {
          setIsEditing(false);
      }
  }

  const handleGenerateVideo = async () => {
      if (!videoPrompt.trim() && !upload) return;
      setIsGeneratingVideo(true);
      setGeneratedVideoUrl(null);

      try {
          // Ensure Veo supported aspects
          const veoAspect = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';
          
          const url = await generateVideo(
              videoPrompt, 
              veoAspect, 
              upload?.base64, 
              upload?.mimeType
          );
          setGeneratedVideoUrl(url);
      } catch (error: any) {
          console.error("Video generation failed", error);
          alert(error.message || "Failed to generate video");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  // Trigger generation for all angles
  const handleGenerate = async () => {
    if (!upload) return;

    setIsProcessing(true);
    setSelectedIds([]); // Clear selection on new generation
    setIsSelectionMode(false); // Reset mode

    // Initialize grid with loading states
    const initialStates: GeneratedView[] = TARGET_ANGLES.map(angle => ({
      id: angle.id,
      angleName: angle.name, // Note: This name is now just a fallback, UI uses translation
      imageUrl: null,
      isLoading: true,
      error: null,
      filter: 'none',
      filterIntensity: 100
    }));
    setGeneratedViews(initialStates);

    const promises = TARGET_ANGLES.map(async (angle) => {
      try {
        const imageUrl = await generateAngleImage(
          upload.base64, 
          upload.mimeType, 
          angle.name,
          aspectRatio,
          quality
        );
        
        setGeneratedViews(prev => prev.map(view => 
          view.id === angle.id 
            ? { ...view, imageUrl, isLoading: false } 
            : view
        ));
      } catch (error) {
        setGeneratedViews(prev => prev.map(view => 
          view.id === angle.id 
            ? { ...view, error: "Failed to generate", isLoading: false } 
            : view
        ));
      }
    });

    await Promise.all(promises);
    setIsProcessing(false);
  };

  const handleRotate = async (targetId: string, direction: 'clockwise' | 'counterclockwise') => {
    const targets = (selectedIds.includes(targetId) && selectedIds.length > 0) 
      ? selectedIds 
      : [targetId];

    setGeneratedViews(prev => prev.map(v => targets.includes(v.id) ? { ...v, isLoading: true } : v));

    const updates = await Promise.all(targets.map(async (id) => {
      const view = generatedViews.find(v => v.id === id);
      if (!view || !view.imageUrl) return { id, success: false };
      
      try {
        const newUrl = await rotateImage(view.imageUrl, direction);
        return { id, success: true, newUrl };
      } catch (e) {
        console.error(`Failed to rotate ${id}`, e);
        return { id, success: false };
      }
    }));

    setGeneratedViews(prev => prev.map(v => {
      const update = updates.find(u => u.id === v.id);
      if (update) {
        return { 
          ...v, 
          isLoading: false, 
          imageUrl: update.success && update.newUrl ? update.newUrl : v.imageUrl 
        };
      }
      return v;
    }));
  };
  
  const handleUpdateView = (id: string, updates: Partial<GeneratedView>) => {
    setGeneratedViews(prev => prev.map(view => 
      view.id === id ? { ...view, ...updates } : view
    ));
  };

  const handleUpscale = async (id: string) => {
    const view = generatedViews.find(v => v.id === id);
    if (!view || !view.imageUrl) return;

    setGeneratedViews(prev => prev.map(v => v.id === id ? { ...v, isUpscaling: true } : v));

    try {
      const match = view.imageUrl.match(/^data:(.+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/png';
      
      const upscaledUrl = await upscaleImage(view.imageUrl, mimeType);
      
      setGeneratedViews(prev => prev.map(v => 
        v.id === id ? { ...v, imageUrl: upscaledUrl, isUpscaling: false } : v
      ));
    } catch (error) {
      console.error("Upscale failed", error);
      setGeneratedViews(prev => prev.map(v => v.id === id ? { ...v, isUpscaling: false } : v));
    }
  };

  const handleBatchUpscale = async () => {
    const targets = selectedIds.filter(id => {
      const view = generatedViews.find(v => v.id === id);
      return view && view.imageUrl && !view.isUpscaling && !view.isLoading;
    });
    
    if (targets.length === 0) return;

    targets.forEach(id => handleUpscale(id));
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
        link.download = `30daynanobanana-${view.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };

  const hasResults = generatedViews.length > 0;
  
  const getEffectiveActiveFilter = () => {
     if (generatedViews.length === 0) return 'none';
     const targets = selectedIds.length > 0 
        ? generatedViews.filter(v => selectedIds.includes(v.id))
        : generatedViews;
     
     const firstFilter = targets[0]?.filter;
     const allSame = targets.every(t => t.filter === firstFilter);
     return allSame ? firstFilter : 'none';
  };

  const activeFilterDisplay = getEffectiveActiveFilter();

  const setInputModeAndClear = (mode: InputMode) => {
      setInputMode(mode);
      setGeneratedViews([]);
      setSelectedIds([]);
      setIsSelectionMode(false);
      setAnalysisResult('');
      setGeneratedVideoUrl(null);
      if (mode === 'video') {
         setAspectRatio('16:9');
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 relative overflow-x-hidden transition-colors duration-300">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-[100%] blur-[120px] mix-blend-normal dark:mix-blend-screen" />
        <div className="absolute -bottom-24 -right-24 w-[600px] h-[600px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[120px] mix-blend-normal dark:mix-blend-screen" />
        <div className="absolute top-1/3 -left-24 w-[400px] h-[400px] bg-blue-600/5 dark:bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="w-full py-4 md:py-6 border-b border-slate-200 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/20 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {t('app.title')}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 mr-2 pr-4 border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                   <img 
                     src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`} 
                     alt={user.name}
                     className="w-8 h-8 rounded-full border border-indigo-500/30"
                   />
                   <div className="hidden md:flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user.name}</span>
                      <span className="text-[10px] text-slate-500 leading-none mt-1 uppercase">{user.provider}</span>
                   </div>
                </div>
                <button 
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title={t('auth.logout')}
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
             </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
              title="Toggle Theme"
            >
               {theme === 'dark' ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
            </button>

            <div className="relative min-w-[120px]">
               <select 
                 value={currentLang} 
                 onChange={(e) => setCurrentLang(e.target.value as Language)}
                 className="appearance-none bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-1.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
               >
                 {languages.map(l => (
                   <option key={l.id} value={l.id}>{l.flag} {l.label}</option>
                 ))}
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center px-4 py-12 relative z-10">
        
        <div className="w-full max-w-2xl text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white drop-shadow-sm transition-colors">
            {inputMode === 'analyze' ? t('mode.analyze') : inputMode === 'edit' ? t('mode.edit') : inputMode === 'video' ? t('mode.video') : t('btn.generate')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg transition-colors">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Mode Selection Tabs */}
        <div className="w-full max-w-lg mx-auto mb-6 bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-sm overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setInputModeAndClear('upload')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap
              ${inputMode === 'upload' 
                ? 'bg-slate-100 dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
            disabled={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            {t('mode.upload')}
          </button>
          <button
            onClick={() => setInputModeAndClear('prompt')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap
              ${inputMode === 'prompt' 
                ? 'bg-indigo-600 dark:bg-indigo-600/80 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
            disabled={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {t('mode.prompt')}
          </button>
          <button
            onClick={() => setInputModeAndClear('analyze')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap
              ${inputMode === 'analyze' 
                ? 'bg-purple-600 dark:bg-purple-600/80 text-white shadow-lg shadow-purple-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
            disabled={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            {t('mode.analyze')}
          </button>
           <button
            onClick={() => setInputModeAndClear('edit')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap
              ${inputMode === 'edit' 
                ? 'bg-pink-600 dark:bg-pink-600/80 text-white shadow-lg shadow-pink-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
            disabled={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            {t('mode.edit')}
          </button>
          <button
            onClick={() => setInputModeAndClear('video')}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap
              ${inputMode === 'video' 
                ? 'bg-red-600 dark:bg-red-600/80 text-white shadow-lg shadow-red-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
            disabled={isProcessing || isGeneratingRef || isAnalyzing || isEditing || isGeneratingVideo}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            {t('mode.video')}
          </button>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-md mx-auto mb-8 min-h-[300px]">
          
          {/* Upload Zone for Upload, Analyze, Edit and Video modes */}
          {(inputMode === 'upload' || inputMode === 'analyze' || inputMode === 'edit' || inputMode === 'video') && (
            <>
                <UploadZone 
                  onFileSelect={processFile} 
                  currentPreview={upload?.previewUrl || null}
                  isGenerating={isProcessing || isAnalyzing || isEditing || isGeneratingVideo}
                  t={t}
                />
                {/* Remove image button for video mode if user wants text-only */}
                {inputMode === 'video' && upload && (
                   <div className="flex justify-center -mt-6 mb-6">
                      <button 
                        onClick={() => setUpload(null)}
                        className="text-xs text-red-500 hover:text-red-600 underline transition-colors"
                      >
                        {t('video.clear_image')}
                      </button>
                   </div>
                )}
            </>
          )}

          {/* Analyze Mode Specifics */}
          {inputMode === 'analyze' && upload && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <textarea
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  placeholder={t('analyze.placeholder')}
                  className="w-full h-32 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none shadow-sm"
                  disabled={isAnalyzing}
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!upload || isAnalyzing}
                className={`
                  w-full py-3 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2
                  ${isAnalyzing ? 'bg-slate-400 dark:bg-slate-800' : 'bg-purple-600 hover:bg-purple-500'}
                `}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {t('analyze.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    {t('analyze.btn')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Edit Mode Specifics */}
          {inputMode === 'edit' && upload && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder={t('edit.placeholder')}
                  className="w-full h-32 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all resize-none shadow-sm"
                  disabled={isEditing}
                />
              </div>

              <button
                onClick={handleEdit}
                disabled={!upload || isEditing}
                className={`
                  w-full py-3 rounded-xl font-semibold text-white shadow-lg shadow-pink-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2
                  ${isEditing ? 'bg-slate-400 dark:bg-slate-800' : 'bg-pink-600 hover:bg-pink-500'}
                `}
              >
                {isEditing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {t('edit.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    {t('edit.btn')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Video Mode Specifics */}
          {inputMode === 'video' && (
             <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative">
                   <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder={t('video.placeholder')}
                      className="w-full h-32 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none shadow-sm"
                      disabled={isGeneratingVideo}
                   />
                </div>

                 {/* Video Aspect Ratio Selector */}
                <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setAspectRatio('16:9')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '16:9' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}
                      disabled={isGeneratingVideo}
                    >
                      16:9
                    </button>
                    <button
                      onClick={() => setAspectRatio('9:16')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '9:16' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}
                      disabled={isGeneratingVideo}
                    >
                      9:16
                    </button>
                </div>

                <button
                   onClick={handleGenerateVideo}
                   disabled={(!upload && !videoPrompt.trim()) || isGeneratingVideo}
                   className={`
                     w-full py-3 rounded-xl font-semibold text-white shadow-lg shadow-red-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2
                     ${isGeneratingVideo ? 'bg-slate-400 dark:bg-slate-800' : 'bg-red-600 hover:bg-red-500'}
                   `}
                >
                   {isGeneratingVideo ? (
                      <>
                         <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         {t('video.loading')}
                      </>
                   ) : (
                      <>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                         {t('video.btn')}
                      </>
                   )}
                </button>
             </div>
          )}

          {/* Text Prompt Mode */}
          {inputMode === 'prompt' && (
            <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              {!upload || isGeneratingRef ? (
                <>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t('prompt.placeholder')}
                      className="w-full h-40 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none shadow-sm"
                      disabled={isGeneratingRef}
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                       {isGeneratingRef && <span className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse bg-slate-100 dark:bg-slate-900/80 px-2 py-1 rounded">{t('prompt.generating')}</span>}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGenerateReference}
                    disabled={!prompt.trim() || isGeneratingRef}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingRef ? (
                       <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                    )}
                    {t('prompt.btn')}
                  </button>
                </>
              ) : (
                <div className="relative group">
                  <div className="w-full h-64 rounded-2xl overflow-hidden border-2 border-indigo-500/50 bg-slate-50 dark:bg-slate-900/50 relative">
                     <img 
                       src={upload.previewUrl} 
                       alt="Generated Reference" 
                       className="w-full h-full object-contain" 
                     />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => setUpload(null)}
                      className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {t('prompt.clear')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Section: Aspect Ratio & Quality (Hidden in Analyze, Edit, and Video Mode - Video has its own) */}
        {inputMode !== 'analyze' && inputMode !== 'edit' && inputMode !== 'video' && (
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 animate-in fade-in duration-300">
            
            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 text-center md:text-left">
                {t('label.aspect_ratio')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => !isProcessing && setAspectRatio(ratio.id)}
                    disabled={isProcessing || isGeneratingRef}
                    className={`
                      px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border backdrop-blur-sm
                      ${aspectRatio === ratio.id 
                        ? 'bg-indigo-600/90 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}
                      ${isProcessing || isGeneratingRef ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {t(`ratio.${ratio.id}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 text-center md:text-left">
                {t('label.quality')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => !isProcessing && setQuality(opt.id)}
                    disabled={isProcessing || isGeneratingRef}
                    className={`
                      px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border backdrop-blur-sm
                      ${quality === opt.id 
                        ? 'bg-indigo-600/90 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}
                      ${isProcessing || isGeneratingRef ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {t(`quality.${opt.id}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate Action Button (Hidden in Analyze, Edit, and Video Mode) */}
        {inputMode !== 'analyze' && inputMode !== 'edit' && inputMode !== 'video' && (
          <div className="mb-16">
            <button
              onClick={handleGenerate}
              disabled={!upload || isProcessing || isGeneratingRef}
              className={`
                relative overflow-hidden px-8 py-4 rounded-full font-semibold text-white shadow-xl
                transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${!upload || isProcessing || isGeneratingRef ? 'bg-slate-400 dark:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25'}
              `}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('btn.generating')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {t('btn.generate')}
                  </>
                )}
              </span>
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {inputMode === 'analyze' && analysisResult && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
             <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-lg border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/50 flex items-center gap-3">
                   <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg text-purple-600 dark:text-purple-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('analyze.result')}</h3>
                </div>
                <div className="p-6 md:p-8 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                   {analysisResult}
                </div>
             </div>
          </div>
        )}

        {/* Video Results */}
        {inputMode === 'video' && generatedVideoUrl && (
           <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{t('video.generated')}</h3>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-black">
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="max-w-full max-h-[70vh]"
                  />
              </div>
              <div className="mt-6">
                 <a 
                   href={generatedVideoUrl} 
                   download="veo-generated-video.mp4"
                   className="px-6 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    {t('video.download')}
                 </a>
              </div>
           </div>
        )}

        {/* Results Grid (Hidden in Analyze and Video Mode) */}
        {inputMode !== 'analyze' && inputMode !== 'video' && (
          <div className="w-full px-4 pb-20">
            {generatedViews.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  
                  {/* Results Toolbar */}
                  {!isProcessing && hasResults && (
                    <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between mb-6 gap-4 px-1">
                      {/* Filter Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
                          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mr-2 shrink-0">
                            {isSelectionMode && selectedIds.length > 0 
                              ? `${t('batch.selected')} (${selectedIds.length}):` 
                              : isSelectionMode 
                                ? `${t('batch.selected')} (0):`
                                : t('filter.label')
                            }
                          </span>
                          {FILTER_OPTIONS.map(f => (
                              <button
                                key={f.id}
                                onClick={() => handleFilterSelect(f.id)}
                                disabled={isSelectionMode && selectedIds.length === 0}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap
                                  ${activeFilterDisplay === f.id
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                  }
                                  ${isSelectionMode && selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                              >
                                {t(`filter.${f.id}`)}
                              </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={handleToggleSelectionMode}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border shadow-sm backdrop-blur-sm
                            ${isSelectionMode 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                          `}
                        >
                          {isSelectionMode ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                              {t('btn.exit_select')}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                              {t('btn.select_mode')}
                            </>
                          )}
                        </button>
                        
                        <button 
                          onClick={handleDownloadAll}
                          className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm backdrop-blur-sm shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                          {selectedIds.length > 0 ? `${t('btn.save_selected')} (${selectedIds.length})` : t('btn.save_all')}
                        </button>
                      </div>
                    </div>
                  )}

                  <GeneratedGrid 
                    items={generatedViews}
                    selectedIds={selectedIds}
                    isSelectionMode={isSelectionMode}
                    onToggleSelection={handleSelectionToggle}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onRotate={handleRotate}
                    onUpdateView={handleUpdateView}
                    onUpscale={handleUpscale}
                    onBatchUpscale={handleBatchUpscale}
                    originalImage={upload?.previewUrl || null}
                    t={t}
                  />
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 dark:text-slate-600 text-sm relative z-10">
        <p>{t('footer.text')}</p>
      </footer>
    </div>
  );
};

export default App;
