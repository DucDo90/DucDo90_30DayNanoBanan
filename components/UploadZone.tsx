
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
      className={`relative w-full max-w-md mx-auto mb-8 transition-all duration-300 ease-in-out ${
        isGenerating ? 'opacity-50 pointer-events-none' : ''
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
          group relative flex flex-col items-center justify-center w-full h-64 
          rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden
          transition-all duration-300
          ${currentPreview 
            ? 'border-indigo-500/50 bg-slate-100 dark:bg-slate-900/50' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/50'}
        `}
      >
        {currentPreview ? (
          <>
            <img 
              src={currentPreview} 
              alt="Uploaded subject" 
              className="absolute inset-0 w-full h-full object-contain p-4 z-10" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
              <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                {t('upload.change')}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
            <svg className="w-10 h-10 mb-3 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{t('upload.click')}</span> {t('upload.drag')}
            </p>
            <p className="text-xs text-slate-500">{t('upload.formats')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
