import React, { useCallback, useRef } from 'react';
import { TranslationFunction } from '../types';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  currentPreview: string | null;
  isGenerating: boolean;
  t: TranslationFunction;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, currentPreview, isGenerating, t }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isGenerating) return;
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect, isGenerating]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className={`relative w-full transition-all duration-500 ease-in-out group ${
        isGenerating ? 'opacity-50 pointer-events-none grayscale' : ''
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <div
        onClick={() => !isGenerating && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative flex flex-col items-center justify-center w-full h-80
          rounded-[2rem] cursor-pointer overflow-hidden
          transition-all duration-500 border-2 border-dashed
          ${currentPreview 
            ? 'border-indigo-500/20 bg-slate-50 dark:bg-black/20' 
            : 'border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-800/20 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'}
        `}
      >
        {currentPreview ? (
          <>
            <div className="absolute inset-0 p-4">
                <img 
                  src={currentPreview} 
                  alt="Uploaded subject" 
                  className="w-full h-full object-contain rounded-2xl shadow-sm animate-fade-in" 
                />
            </div>
            <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span className="inline-flex items-center gap-2 text-white font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-full backdrop-blur-md transition-all shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {t('upload.change')}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-4">{t('upload.drag')}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 z-10 text-center">
            <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
               <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
               <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center relative z-10 border border-indigo-100 dark:border-slate-700">
                  <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
               </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2 tracking-tight">
               {t('upload.click')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] leading-relaxed">
               {t('upload.drag')}
            </p>
            <div className="mt-6 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('upload.formats')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};