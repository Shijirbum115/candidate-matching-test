// src/components/SearchInput/FilterInput.js
import React, { useEffect, useRef } from 'react';

const FilterInput = ({ id, value, onChange, placeholder, isCompact }) => {
  const inputRef = useRef(null);
  
  // Auto-focus input when it appears
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  return (
    <div className="mt-2 animate-slideDown">
      <input
        id={`filter-${id}`}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black text-sm"
      />
    </div>
  );
};

export default FilterInput;