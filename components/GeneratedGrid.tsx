import React, { useState, useRef } from 'react';
import { GeneratedView, ImageFilter, FILTER_OPTIONS, TranslationFunction } from '../types';
import { ImageCropper } from './ImageCropper';

interface GeneratedGridProps {
  items: GeneratedView[];
  selectedIds: string[];
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRotate: (id: string, direction: 'clockwise' | 'counterclockwise') => void;
  onUpdateView: (id: string, updates: Partial<GeneratedView>) => void;
  onUpscale: (id: string) => void;
  onBatchUpscale: () => void;
  originalImage: string | null;
  t: TranslationFunction;
}

export const GeneratedGrid: React.FC<GeneratedGridProps> = ({ 
  items, 
  selectedIds,
  isSelectionMode,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onRotate, 
  onUpdateView,
  onUpscale,
  onBatchUpscale,
  originalImage,
  t
}) => {
  const [lightboxViewId, setLightboxViewId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState(50);
  const [isCropping, setIsCropping] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTargetId, setExportTargetId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [exportQuality, setExportQuality] = useState(90);

  const handleCloseLightbox = () => {
    setLightboxViewId(null);
    setIsComparing(false);
    setIsCropping(false);
    setComparisonOpacity(50);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY;
    const factor = 0.001;
    const scale = 1 + (delta * factor);
    setZoom(z => Math.min(Math.max(0.1, z * scale), 8));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const openExportModal = (id: string) => {
    setExportTargetId(id);
    setExportFormat('png');
    setExportQuality(90);
    setExportModalOpen(true);
  };

  const handleExportConfirm = () => {
    if (!exportTargetId) return;
    const view = items.find(i => i.id === exportTargetId);
    if (!view || !view.imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = view.imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (view.filter !== 'none') {
         const filterConfig = FILTER_OPTIONS.find(f => f.id === view.filter);
         if (filterConfig && filterConfig.cssProperty) {
           ctx.filter = `${filterConfig.cssProperty}(${view.filterIntensity}${filterConfig.unit || ''})`;
         }
      }

      if (exportFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'jpg' ? exportQuality / 100 : undefined;

      const dataUrl = canvas.toDataURL(mimeType, quality);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `nanobanana-${view.id}-${Date.now()}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportModalOpen(false);
      setExportTargetId(null);
    };
  };

  const selectedView = items.find(item => item.id === lightboxViewId);
  const selectedImage = selectedView?.imageUrl || null;

  const getFilterStyle = (filter: ImageFilter, intensity: number) => {
    if (filter === 'none') return {};
    const option = FILTER_OPTIONS.find(f => f.id === filter);
    if (!option || !option.cssProperty) return {};
    return { filter: `${option.cssProperty}(${intensity}${option.unit})` };
  };

  const currentFilterConfig = selectedView ? FILTER_OPTIONS.find(f => f.id === selectedView.filter) : undefined;

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto relative animate-in fade-in duration-500">
        {items.map((item, index) => {
           const isSelected = selectedIds.includes(item.id);
           
           return (
            <div 
              key={item.id}
              className={`
                group relative rounded-2xl overflow-hidden transition-all duration-500
                ${isSelected 
                   ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-50 dark:ring-offset-[#050505] shadow-2xl shadow-indigo-500/20 scale-[1.02]' 
                   : 'bg-white dark:bg-slate-900/40 shadow-lg hover:shadow-2xl hover:scale-[1.01] border border-slate-200 dark:border-slate-800'}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => {
                if (item.isLoading) return;
                if (isSelectionMode) {
                    onToggleSelection(item.id);
                } else if (item.imageUrl) {
                    setLightboxViewId(item.id);
                }
              }}
            >
              {/* Image Container */}
              <div className={`aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-950 ${isSelectionMode ? 'cursor-pointer' : 'cursor-zoom-in'}`}>
                {item.isLoading || item.isUpscaling ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/80 backdrop-blur-sm z-10">
                    <div className="relative">
                       <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30"></div>
                       <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <span className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse uppercase tracking-widest">
                      {item.isUpscaling ? t('status.upscaling') : t('status.generating')}
                    </span>
                  </div>
                ) : null}
                
                {item.error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-50 dark:bg-red-900/10">
                     <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-3 text-red-500">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     </div>
                    <span className="text-red-500 font-bold text-xs uppercase tracking-wide">{t('status.failed')}</span>
                  </div>
                ) : item.imageUrl ? (
                   <img 
                      src={item.imageUrl} 
                      alt={item.angleName} 
                      style={getFilterStyle(item.filter, item.filterIntensity)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700">
                     <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                   </div>
                )}

                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

                {/* Title Badge */}
                <div className="absolute top-3 left-3 z-20">
                  <span className="px-3 py-1 bg-white/90 dark:bg-black/60 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg border border-white/10">
                    {t(`angle.${item.id}`)}
                  </span>
                </div>

                {/* Checkbox for Selection Mode */}
                {!item.isLoading && item.imageUrl && (isSelectionMode || isSelected) && (
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelection(item.id); }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-indigo-500 border-indigo-500 shadow-glow' : 'bg-black/40 border-white/50 hover:border-white'}`}
                    >
                      {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar (Bottom) */}
              {item.imageUrl && !item.isLoading && !isSelectionMode && (
                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-20">
                   <div className="flex gap-2">
                     <button onClick={(e) => { e.stopPropagation(); onRotate(item.id, 'counterclockwise'); }} className="p-2 bg-white/10 hover:bg-indigo-600 backdrop-blur-md rounded-full text-white transition-colors border border-white/10" title={t('tooltip.rotate_left')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                     </button>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={(e) => { e.stopPropagation(); onUpscale(item.id); }} className="p-2 bg-white/10 hover:bg-indigo-600 backdrop-blur-md rounded-full text-white transition-colors border border-white/10" title={t('tooltip.upscale')}>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); openExportModal(item.id); }} className="p-2 bg-white/10 hover:bg-indigo-600 backdrop-blur-md rounded-full text-white transition-colors border border-white/10" title={t('tooltip.export')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     </button>
                   </div>
                </div>
              )}
            </div>
           );
        })}
      </div>

      {/* Batch Toolbar */}
      <div className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${selectedIds.length > 0 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90 pointer-events-none'}
      `}>
        <div className="bg-slate-900/80 dark:bg-white/10 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 min-w-[320px]">
           <span className="text-sm font-bold text-white whitespace-nowrap">
             {selectedIds.length} {t('batch.selected')}
           </span>
           <div className="h-6 w-px bg-white/20"></div>
           <div className="flex gap-2">
              <button onClick={onSelectAll} className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors">{t('batch.select_all')}</button>
              <button onClick={onDeselectAll} className="px-4 py-1.5 rounded-full text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors">{t('batch.clear')}</button>
           </div>
           <div className="flex gap-2 pl-2">
              <button onClick={() => selectedIds.length > 0 && onBatchUpscale()} className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-full transition-colors" title={t('batch.upscale')}>
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </button>
           </div>
        </div>
      </div>

      {/* Export Modal */}
      {exportModalOpen && exportTargetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t('export.title')}</h3>
            
            <div className="space-y-8">
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">{t('export.format')}</label>
                  <div className="grid grid-cols-2 gap-4">
                     {['png', 'jpg'].map((fmt) => (
                        <button key={fmt} onClick={() => setExportFormat(fmt as any)} className={`py-4 rounded-2xl font-bold text-sm border-2 transition-all uppercase ${exportFormat === fmt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{fmt}</button>
                     ))}
                  </div>
               </div>
               
               <div className={`transition-all duration-300 overflow-hidden ${exportFormat === 'jpg' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                   <div className="flex justify-between mb-3">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t('export.quality')}</label>
                      <span className="text-xs font-mono font-bold text-indigo-500">{exportQuality}%</span>
                   </div>
                   <input type="range" min="10" max="100" value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
               </div>
            </div>

            <div className="mt-10 flex gap-4">
               <button onClick={() => setExportModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{t('btn.cancel')}</button>
               <button onClick={handleExportConfirm} className="flex-1 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all">{t('btn.export')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxViewId && selectedView && selectedImage && (
         <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200" onClick={handleCloseLightbox}>
            <div className="h-20 w-full flex items-center justify-between px-8 z-50 shrink-0 border-b border-white/10 bg-black/20">
               <div className="flex gap-4">
                  <button onClick={(e) => { e.stopPropagation(); setIsComparing(!isComparing); }} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${isComparing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                     {isComparing ? t('lightbox.show_gen') : t('lightbox.compare')}
                  </button>
                  {!isComparing && !isCropping && (
                     <button onClick={(e) => { e.stopPropagation(); setIsCropping(true); }} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-all">
                        {t('lightbox.crop')}
                     </button>
                  )}
               </div>
               <button onClick={handleCloseLightbox} className="p-3 text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="flex-1 min-h-0 w-full relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
               {isCropping ? (
                  <ImageCropper imageUrl={selectedImage} filterStyle={getFilterStyle(selectedView.filter, selectedView.filterIntensity)} onCancel={() => setIsCropping(false)} onSave={(newUrl) => { onUpdateView(lightboxViewId!, { imageUrl: newUrl }); setIsCropping(false); }} t={t} />
               ) : (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center" onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} className="relative transition-transform duration-75 ease-linear will-change-transform">
                         <img src={selectedImage} alt="View" style={!isComparing ? getFilterStyle(selectedView.filter, selectedView.filterIntensity) : {}} className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl pointer-events-none select-none" draggable={false} />
                         {isComparing && originalImage && <img src={originalImage} alt="Original" style={{ opacity: comparisonOpacity / 100 }} className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none select-none" draggable={false} />}
                      </div>
                  </div>
               )}
            </div>
            
            {/* Footer Controls */}
            {((!isComparing && selectedView.filter !== 'none' && currentFilterConfig) || isComparing) && (
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-6 rounded-[2rem] pointer-events-auto w-[360px] shadow-2xl">
                     <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-4">
                        <span>{isComparing ? t('lightbox.opacity') : `${t(`filter.${selectedView.filter}`)}`}</span>
                        <span className="text-indigo-400 font-mono">{isComparing ? `${comparisonOpacity}%` : selectedView.filterIntensity}</span>
                     </div>
                     <input 
                        type="range" 
                        min={isComparing ? 0 : currentFilterConfig?.min} 
                        max={isComparing ? 100 : currentFilterConfig?.max} 
                        value={isComparing ? comparisonOpacity : selectedView.filterIntensity} 
                        onChange={(e) => isComparing ? setComparisonOpacity(Number(e.target.value)) : onUpdateView(lightboxViewId!, { filterIntensity: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                     />
                  </div>
               </div>
            )}
         </div>
      )}
    </>
  );
};