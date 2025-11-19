
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem('nano_session');
    if (storedSession) {
      try {
        setUser(JSON.parse(storedSession));
      } catch (e) {
        localStorage.removeItem('nano_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const storedUsers = JSON.parse(localStorage.getItem('nano_users') || '[]');
    const foundUser = storedUsers.find((u: any) => u.email === email && u.password === pass);

    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        provider: 'email',
        avatar: foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}&background=6366f1&color=fff`
      };
      setUser(userData);
      localStorage.setItem('nano_session', JSON.stringify(userData));
    } else {
      setError('auth.error_creds');
    }
    setIsLoading(false);
  };

  const register = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const storedUsers = JSON.parse(localStorage.getItem('nano_users') || '[]');
    if (storedUsers.some((u: any) => u.email === email)) {
      setError('auth.error_exists');
      setIsLoading(false);
      return;
    }

    const newUser = { 
      id: Date.now().toString(), 
      name, 
      email, 
      password: pass,
      provider: 'email',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`
    };
    storedUsers.push(newUser);
    localStorage.setItem('nano_users', JSON.stringify(storedUsers));

    // Auto login after register
    const userData: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      provider: 'email',
      avatar: newUser.avatar
    };
    setUser(userData);
    localStorage.setItem('nano_session', JSON.stringify(userData));
    setIsLoading(false);
  };

  const googleLogin = async () => {
    setIsLoading(true);
    setError(null);
    // Simulate OAuth popup and return
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const email = 'demo@gmail.com';
    const storedUsers = JSON.parse(localStorage.getItem('nano_users') || '[]');
    let foundUser = storedUsers.find((u: any) => u.email === email);

    if (!foundUser) {
        foundUser = {
            id: 'google_' + Date.now(),
            name: 'Demo User',
            email: email,
            provider: 'google',
            avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        };
        storedUsers.push(foundUser);
        localStorage.setItem('nano_users', JSON.stringify(storedUsers));
    }
    
    const userData: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        provider: 'google',
        avatar: foundUser.avatar
    };

    setUser(userData);
    localStorage.setItem('nano_session', JSON.stringify(userData));
    setIsLoading(false);
  };

  const phoneLogin = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const storedUsers = JSON.parse(localStorage.getItem('nano_users') || '[]');
    let foundUser = storedUsers.find((u: any) => u.phone === phone);

    if (!foundUser) {
         foundUser = {
            id: 'phone_' + phone.replace(/\D/g,''),
            name: `User ${phone.slice(-4)}`,
            phone: phone,
            provider: 'phone',
            avatar: `https://ui-avatars.com/api/?name=${phone.slice(-2)}&background=10b981&color=fff`
          };
          storedUsers.push(foundUser);
          localStorage.setItem('nano_users', JSON.stringify(storedUsers));
    }

    const userData: User = {
        id: foundUser.id,
        name: foundUser.name,
        phone: foundUser.phone,
        provider: 'phone',
        avatar: foundUser.avatar
    };

    setUser(userData);
    localStorage.setItem('nano_session', JSON.stringify(userData));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nano_session');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, googleLogin, phoneLogin, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
