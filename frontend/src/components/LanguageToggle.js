import React from 'react';
import { useLanguage } from './LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="language-toggle-button"
    >
      {language === 'en' ? 'МН' : 'EN'}
    </button>
  );
};

export default LanguageToggle;