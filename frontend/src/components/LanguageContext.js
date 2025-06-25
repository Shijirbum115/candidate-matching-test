import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a context for language preferences
const LanguageContext = createContext();

// Create a provider component
export const LanguageProvider = ({ children }) => {
  // Check local storage for saved preference, default to Mongolian
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    return savedLanguage || 'mn';
  });

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'mn' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  // Save language preference when it changes
  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};