import React from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';

const Logo = () => {
  const { language } = useLanguage();
  
  return (
    <div className="logo">
      <h1>{translations[language].appTitle}</h1>
    </div>
  );
};

export default Logo;