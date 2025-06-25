import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';

const StarButton = ({ 
  isStarred, 
  onToggle, 
  isLoading = false, 
  size = 'medium',
  showTooltip = true 
}) => {
  const { language } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    if (isLoading) return;
    
    setIsAnimating(true);
    try {
      await onToggle();
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5', 
    large: 'w-6 h-6'
  };

  const tooltip = isStarred 
    ? (language === 'mn' ? 'Хадгалснаас хасах' : 'Remove from saved')
    : (language === 'mn' ? 'Хадгалах' : 'Save candidate');

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        star-button
        ${sizeClasses[size]}
        ${isStarred ? 'starred' : 'unstarred'}
        ${isAnimating ? 'animating' : ''}
        ${isLoading ? 'loading' : ''}
      `}
      title={showTooltip ? tooltip : ''}
    >
      {isLoading ? (
        <div className="loading-spinner-small" />
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill={isStarred ? "currentColor" : "none"}
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
    </button>
  );
};

export default StarButton;