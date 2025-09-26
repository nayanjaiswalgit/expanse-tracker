import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  wrapperClassName?: string;
  className?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  maxHeight?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  wrapperClassName = '',
  className = '',
  searchPlaceholder = "Search options...",
  required = false,
  disabled = false,
  allowClear = false,
  maxHeight = "200px"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          console.log('Enter key selected:', filteredOptions[highlightedIndex]);
          onChange(filteredOptions[highlightedIndex]?.value);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (option: Option, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log('Option clicked:', option);
    onChange(option?.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${wrapperClassName}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={`
          relative w-full min-h-[28px] p-1 px-4 bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
          hover:border-gray-400 dark:hover:border-gray-500
          focus-within:border-blue-500 dark:focus-within:border-blue-400
          focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-900
          cursor-pointer transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''}
          ${isOpen ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : ''}
          ${className}
        `}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center justify-between min-h-[20px]">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm   text-gray-900 dark:text-white truncate leading-tight">
                  {selectedOption.label}
                </span>
                {selectedOption.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                    {selectedOption.description}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 ml-3">
            {allowClear && selectedOption && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg" style={{ minWidth: '200px' }} onClick={(e) => e.stopPropagation()}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto" style={{ maxHeight }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors duration-150 select-none
                    ${index === highlightedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${option.value === value ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOptionClick(option, e);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">No options found</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};