
import React, { useState, useRef } from 'react';
import { TranslationFunction } from '../types';

interface ImageCropperProps {
  imageUrl: string;
  onCancel: () => void;
  onSave: (newUrl: string) => void;
  filterStyle?: React.CSSProperties;
  t: TranslationFunction;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCancel, onSave, filterStyle, t }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeInteraction = useRef<{ type: 'move' | 'resize', handle?: string, startX: number, startY: number, startCrop: typeof crop } | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Initialize crop to 80% of the displayed image
    const width = img.width;
    const height = img.height;
    const cropW = width * 0.8;
    const cropH = height * 0.8;
    
    setCrop({
      x: (width - cropW) / 2,
      y: (height - cropH) / 2,
      width: cropW,
      height: cropH
    });
    setLoaded(true);
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    activeInteraction.current = {
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop }
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeInteraction.current || !imgRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { type, handle, startX, startY, startCrop } = activeInteraction.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const imgW = imgRef.current.width;
    const imgH = imgRef.current.height;

    let newCrop = { ...startCrop };

    if (type === 'move') {
      newCrop.x = Math.min(Math.max(startCrop.x + deltaX, 0), imgW - startCrop.width);
      newCrop.y = Math.min(Math.max(startCrop.y + deltaY, 0), imgH - startCrop.height);
    } else if (type === 'resize') {
       const minSize = 40;

       if (handle?.includes('e')) {
         newCrop.width = Math.max(minSize, Math.min(startCrop.width + deltaX, imgW - startCrop.x));
       }
       if (handle?.includes('s')) {
         newCrop.height = Math.max(minSize, Math.min(startCrop.height + deltaY, imgH - startCrop.y));
       }
       if (handle?.includes('w')) {
         const maxDelta = startCrop.width - minSize;
         const safeDelta = Math.min(Math.max(deltaX, -startCrop.x), maxDelta);
         newCrop.x = startCrop.x + safeDelta;
         newCrop.width = startCrop.width - safeDelta;
       }
       if (handle?.includes('n')) {
         const maxDelta = startCrop.height - minSize;
         const safeDelta = Math.min(Math.max(deltaY, -startCrop.y), maxDelta);
         newCrop.y = startCrop.y + safeDelta;
         newCrop.height = startCrop.height - safeDelta;
       }
    }

    setCrop(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeInteraction.current) {
      activeInteraction.current = null;
      if (e.target instanceof HTMLElement) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (err) {
          // Ignore error if element was removed
        }
      }
    }
  };

  const onSaveClick = () => {
    if (!imgRef.current) return;
    
    const canvas = document.createElement('canvas');
    const img = imgRef.current;
    // Calculate scale between displayed image and natural image
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        img,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0, 0,
        canvas.width,
        canvas.height
      );
      onSave(canvas.toDataURL());
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <img 
        ref={imgRef}
        src={imageUrl} 
        onLoad={onImageLoad}
        style={filterStyle}
        className="max-w-full max-h-[80vh] object-contain pointer-events-none select-none"
        alt="Crop target"
        draggable={false}
      />

      {loaded && (
        <>
          {/* Overlay area outside crop (using box-shadow for the hole effect) */}
          <div
            style={{
              left: crop.x + (imgRef.current?.offsetLeft || 0),
              top: crop.y + (imgRef.current?.offsetTop || 0),
              width: crop.width,
              height: crop.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)'
            }}
            className="absolute z-10 border-2 border-white/80 cursor-move"
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
             {/* Grid Lines */}
             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
               <div className="border-r border-white/30"></div>
               <div className="border-r border-white/30"></div>
               <div className="border-b border-white/30 col-span-3 row-start-1"></div>
               <div className="border-b border-white/30 col-span-3 row-start-2"></div>
             </div>

            {/* Resize Handles */}
            {['nw', 'ne', 'sw', 'se'].map(pos => (
              <div
                key={pos}
                className={`absolute w-5 h-5 bg-indigo-500 border-2 border-white rounded-full z-20 shadow-lg
                  ${pos === 'nw' ? '-top-2.5 -left-2.5 cursor-nw-resize' : ''}
                  ${pos === 'ne' ? '-top-2.5 -right-2.5 cursor-ne-resize' : ''}
                  ${pos === 'sw' ? '-bottom-2.5 -left-2.5 cursor-sw-resize' : ''}
                  ${pos === 'se' ? '-bottom-2.5 -right-2.5 cursor-se-resize' : ''}
                `}
                onPointerDown={(e) => handlePointerDown(e, 'resize', pos)}
              />
            ))}
             {['n', 'e', 's', 'w'].map(pos => (
              <div
                key={pos}
                className={`absolute bg-white/80 z-20 rounded-full
                  ${pos === 'n' ? '-top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 cursor-n-resize' : ''}
                  ${pos === 'e' ? '-right-1 top-1/2 -translate-y-1/2 h-8 w-1.5 cursor-e-resize' : ''}
                  ${pos === 's' ? '-bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 cursor-s-resize' : ''}
                  ${pos === 'w' ? '-left-1 top-1/2 -translate-y-1/2 h-8 w-1.5 cursor-w-resize' : ''}
                `}
                onPointerDown={(e) => handlePointerDown(e, 'resize', pos)}
              />
            ))}
          </div>

          {/* Toolbar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-50 bg-white dark:bg-black/80 p-2.5 rounded-2xl backdrop-blur-lg border border-slate-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
            <button 
              onClick={onCancel}
              className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-semibold"
            >
              {t('btn.cancel')}
            </button>
            <button 
              onClick={onSaveClick}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              {t('crop.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
