
export interface GeneratedView {
  id: string;
  angleName: string;
  imageUrl: string | null;
  isLoading: boolean;
  isUpscaling?: boolean;
  error: string | null;
  filter: ImageFilter;
  filterIntensity: number;
}

export type TranslationFunction = (key: string) => string;

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  provider: 'email' | 'google' | 'phone';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  phoneLogin: (phone: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

export const TARGET_ANGLES = [
  { id: 'front', name: 'Front View' },
  { id: 'side', name: 'Side Profile' },
  { id: 'isometric', name: 'Isometric View' },
  { id: 'top', name: 'Top-Down View' },
];

export interface FileUpload {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export type AspectRatio = '1:1' | '16:9' | '4:3' | '9:16';

export const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: '1:1', label: 'Square (1:1)' },
  { id: '16:9', label: 'Wide (16:9)' },
  { id: '4:3', label: 'Standard (4:3)' },
  { id: '9:16', label: 'Tall (9:16)' },
];

export type ImageQuality = 'low' | 'medium' | 'high';

export const QUALITY_OPTIONS: { id: ImageQuality; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export type ImageFilter = 'none' | 'grayscale' | 'sepia' | 'invert' | 'contrast' | 'blur';

export interface FilterConfig {
  id: ImageFilter;
  label: string;
  cssProperty?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
}

export const FILTER_OPTIONS: FilterConfig[] = [
  { id: 'none', label: 'Normal' },
  { id: 'grayscale', label: 'B&W', cssProperty: 'grayscale', min: 0, max: 100, defaultValue: 100, unit: '%' },
  { id: 'sepia', label: 'Sepia', cssProperty: 'sepia', min: 0, max: 100, defaultValue: 100, unit: '%' },
  { id: 'invert', label: 'Invert', cssProperty: 'invert', min: 0, max: 100, defaultValue: 100, unit: '%' },
  { id: 'contrast', label: 'Contrast', cssProperty: 'contrast', min: 50, max: 200, defaultValue: 125, unit: '%' },
  { id: 'blur', label: 'Blur', cssProperty: 'blur', min: 0, max: 20, defaultValue: 4, unit: 'px' },
];