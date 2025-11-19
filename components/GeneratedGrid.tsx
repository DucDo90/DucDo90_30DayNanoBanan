
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
  // Track selected item ID for Lightbox
  const [lightboxViewId, setLightboxViewId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState(50);
  const [isCropping, setIsCropping] = useState(false);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Export State
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

  // Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY;
    const factor = 0.001;
    // Smooth multiplicative zoom
    const scale = 1 + (delta * factor);
    setZoom(z => Math.min(Math.max(0.1, z * scale), 8));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click
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

      // Apply filters if any
      if (view.filter !== 'none') {
         const filterConfig = FILTER_OPTIONS.find(f => f.id === view.filter);
         if (filterConfig && filterConfig.cssProperty) {
           ctx.filter = `${filterConfig.cssProperty}(${view.filterIntensity}${filterConfig.unit || ''})`;
         }
      }

      // Draw background for JPG (remove transparency)
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
      link.download = `30daynanobanana-${view.id}-${Date.now()}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportModalOpen(false);
      setExportTargetId(null);
    };
  };

  const selectedView = items.find(item => item.id === lightboxViewId);
  const selectedImage = selectedView?.imageUrl || null;

  // Helper to get current filter style for a specific view
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-6xl mx-auto relative">
        {items.map((item) => {
           const isSelected = selectedIds.includes(item.id);
           
           return (
            <div 
              key={item.id}
              className={`
                relative group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 h-80
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : 'border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50'}
              `}
              onClick={() => {
                if (item.isLoading) return;
                
                if (isSelectionMode) {
                    // In selection mode, toggle selection on any click
                    onToggleSelection(item.id);
                } else if (item.imageUrl) {
                    // In normal mode, open lightbox
                    setLightboxViewId(item.id);
                }
              }}
            >
              {/* Header Label & Selection Checkbox */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-20 flex justify-between items-start pointer-events-none">
                <span className="text-sm font-semibold text-white tracking-wide uppercase bg-black/30 px-2 py-1 rounded backdrop-blur-md border border-white/10 shadow-sm">
                  {t(`angle.${item.id}`)}
                </span>

                {/* Selection Checkbox - Visible if selection mode active OR item is selected */}
                {!item.isLoading && item.imageUrl && (isSelectionMode || isSelected) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelection(item.id);
                    }}
                    className={`
                      pointer-events-auto w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                      ${isSelected 
                        ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/50 scale-110' 
                        : 'bg-black/20 border-white/50 hover:border-white hover:bg-black/40'}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Content State */}
              <div className={`w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 ${isSelectionMode ? 'cursor-pointer' : 'cursor-zoom-in'}`}>
                {item.isLoading || item.isUpscaling ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-xs text-indigo-500 dark:text-indigo-300 animate-pulse">
                      {item.isUpscaling ? t('status.upscaling') : t('status.generating')}
                    </span>
                  </div>
                ) : item.error ? (
                  <div className="px-6 text-center">
                    <span className="text-red-500 dark:text-red-400 text-sm font-medium block mb-1">{t('status.failed')}</span>
                    <span className="text-xs text-slate-500">{item.error}</span>
                  </div>
                ) : item.imageUrl ? (
                  <div className="w-full h-full animate-fade-scale">
                    <img 
                      src={item.imageUrl} 
                      alt={item.angleName} 
                      style={getFilterStyle(item.filter, item.filterIntensity)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600 text-sm">{t('status.waiting')}</span>
                )}
              </div>
              
              {/* Action Buttons (only if image exists and NOT in selection mode) */}
              {item.imageUrl && !item.isLoading && !item.isUpscaling && !isSelectionMode && (
                <>
                  {/* Rotate Controls - Individual */}
                  <div className="absolute bottom-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotate(item.id, 'counterclockwise');
                      }}
                      className="p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full backdrop-blur-md shadow-lg hover:shadow-indigo-500/50 transition-colors border border-white/10"
                      title={t('tooltip.rotate_left')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotate(item.id, 'clockwise');
                      }}
                      className="p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full backdrop-blur-md shadow-lg hover:shadow-indigo-500/50 transition-colors border border-white/10"
                      title={t('tooltip.rotate_right')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Right Action Group */}
                  <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-30">
                    {/* Upscale Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpscale(item.id);
                      }}
                      className="p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full backdrop-blur-md shadow-lg hover:shadow-indigo-500/50 transition-colors border border-white/10"
                      title={t('tooltip.upscale')}
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                       </svg>
                    </button>

                    {/* Export Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openExportModal(item.id);
                      }}
                      className="p-2 bg-black/40 hover:bg-indigo-600 text-white rounded-full backdrop-blur-md shadow-lg hover:shadow-indigo-500/50 transition-colors border border-white/10"
                      title={t('tooltip.export')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
           );
        })}
      </div>

      {/* Batch Actions Toolbar - Visible if items are selected */}
      <div className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out
        ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}
      `}>
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 min-w-[320px]">
          <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-700 pr-6">
             <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
               {selectedIds.length}
             </span>
             <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('batch.selected')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll} 
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('batch.select_all')}
            </button>
            <button 
              onClick={onDeselectAll}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('batch.clear')}
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <button 
               onClick={() => {
                  if (selectedIds.length > 0) onRotate(selectedIds[0], 'counterclockwise');
               }}
               className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
               title={t('batch.rotate_left')}
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <button 
               onClick={() => {
                  if (selectedIds.length > 0) onRotate(selectedIds[0], 'clockwise');
               }}
               className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
               title={t('batch.rotate_right')}
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </button>
            
            <button
               onClick={onBatchUpscale}
               className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
               title={t('batch.upscale')}
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
               </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Export Options Modal */}
      {exportModalOpen && exportTargetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('export.title')}</h3>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('export.format')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {['png', 'jpg'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt as any)}
                      className={`
                        py-2.5 px-4 rounded-lg font-medium text-sm border transition-all flex items-center justify-center gap-2 uppercase
                        ${exportFormat === fmt 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'}
                      `}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider (JPG Only) */}
              <div className={`transition-all duration-300 overflow-hidden ${exportFormat === 'jpg' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('export.quality')}</label>
                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 rounded">{exportQuality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-600">
                  <span>{t('export.low_size')}</span>
                  <span>{t('export.high_quality')}</span>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 flex gap-2 items-start">
                <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>{t('export.info')}</p>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setExportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('btn.cancel')}
              </button>
              <button 
                onClick={handleExportConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
              >
                {t('btn.export')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxViewId && selectedView && selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col bg-white/95 dark:bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={handleCloseLightbox}
        >
          {/* Top Controls Bar */}
          <div className="h-20 w-full flex items-center justify-between px-6 z-50 shrink-0 pointer-events-auto">
             {/* Left: Comparison Toggle */}
             <div className="flex gap-3">
                {originalImage && !isCropping && (
                  <button
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm backdrop-blur-md transition-all
                      ${isComparing 
                        ? 'bg-indigo-500 text-white border border-indigo-400 shadow-lg shadow-indigo-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsComparing(!isComparing);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {isComparing ? t('lightbox.show_gen') : t('lightbox.compare')}
                  </button>
                )}

                {/* Crop Toggle - Only available for Generated Image when NOT comparing */}
                {!isComparing && !isCropping && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCropping(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm backdrop-blur-md transition-all bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                    title="Crop Image"
                  >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     {t('lightbox.crop')}
                  </button>
                )}
             </div>

             {/* Right: Close */}
             <div className="flex items-center gap-4">
                 {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && !isCropping && (
                   <button
                     onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({x:0, y:0}); }}
                     className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                   >
                     {t('lightbox.reset')}
                   </button>
                 )}
                 <button 
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                    onClick={handleCloseLightbox}
                    title="Close"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
             </div>
          </div>

          {/* Main Content Area */}
          <div 
            className="flex-1 min-h-0 w-full flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
             {isCropping ? (
               <ImageCropper 
                 imageUrl={selectedImage}
                 filterStyle={getFilterStyle(selectedView.filter, selectedView.filterIntensity)}
                 onCancel={() => setIsCropping(false)}
                 onSave={(newUrl) => {
                   onUpdateView(lightboxViewId!, { imageUrl: newUrl });
                   setIsCropping(false);
                 }}
                 t={t}
               />
             ) : (
               <>
                  {/* Image Label */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                     <span className="px-3 py-1 bg-black/60 text-white text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/10">
                       {isComparing ? t('lightbox.overlay') : t('lightbox.output')}
                     </span>
                  </div>

                  {/* Image Container - using Grid to stack images for comparison */}
                  <div 
                    className="flex-1 min-h-0 w-full flex items-center justify-center p-4 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
                    onWheel={handleWheel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                      <div 
                        className="relative grid place-items-center transition-transform duration-100 ease-out origin-center will-change-transform"
                        style={{
                           transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        }}
                      >
                          {/* Generated Image - Base Layer */}
                          <img 
                            src={selectedImage} 
                            alt="Generated" 
                            style={!isComparing ? getFilterStyle(selectedView.filter, selectedView.filterIntensity) : {}}
                            className={`col-start-1 row-start-1 max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-300 select-none pointer-events-none ${isComparing ? '' : ''}`}
                            draggable={false}
                          />
                          
                          {/* Original Image - Overlay Layer */}
                          {isComparing && originalImage && (
                            <img 
                              src={originalImage} 
                              alt="Original" 
                              style={{ opacity: comparisonOpacity / 100 }}
                              className="col-start-1 row-start-1 max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-opacity duration-100 z-10 select-none pointer-events-none"
                              draggable={false}
                            />
                          )}
                      </div>
                  </div>
                  
                  {/* Footer Controls Area - Sliders */}
                  {((!isComparing && selectedView.filter !== 'none' && currentFilterConfig) || isComparing) && (
                    <div className="shrink-0 w-full flex justify-center pb-8 pt-2 px-4 z-50 pointer-events-none">
                      <div className="pointer-events-auto">
                      {/* Filter Intensity Slider - Standard View */}
                      {!isComparing && selectedView.filter !== 'none' && currentFilterConfig && (
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 w-[300px] max-w-full shadow-xl animate-in slide-in-from-bottom-4 fade-in">
                          <div className="flex justify-between w-full text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                            <span>{t(`filter.${selectedView.filter}`)} {t('lightbox.intensity')}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{selectedView.filterIntensity}{currentFilterConfig.unit}</span>
                          </div>
                          <input
                            type="range"
                            min={currentFilterConfig.min}
                            max={currentFilterConfig.max}
                            value={selectedView.filterIntensity}
                            onChange={(e) => onUpdateView(lightboxViewId!, { filterIntensity: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                          <div className="flex justify-between w-full text-[10px] text-slate-500 dark:text-slate-600 font-mono mt-1">
                             <span>{currentFilterConfig.min}{currentFilterConfig.unit}</span>
                             <span>{currentFilterConfig.max}{currentFilterConfig.unit}</span>
                          </div>
                        </div>
                      )}

                      {/* Comparison Opacity Slider - Overlay View */}
                      {isComparing && (
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 w-[300px] max-w-full shadow-xl animate-in slide-in-from-bottom-4 fade-in">
                          <div className="flex justify-between w-full text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                            <span>{t('lightbox.opacity')}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{comparisonOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={comparisonOpacity}
                            onChange={(e) => setComparisonOpacity(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                          <div className="flex justify-between w-full text-[10px] text-slate-500 dark:text-slate-600 font-mono mt-1">
                             <span>Generated</span>
                             <span>Original</span>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
               </>
             )}
          </div>
        </div>
      )}
    </>
  );
};
