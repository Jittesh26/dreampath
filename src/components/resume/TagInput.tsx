'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';

interface TagInputProps {
  label: string;
  helperText?: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({
  label,
  helperText,
  placeholder = 'Type and press Enter or comma...',
  tags = [],
  onChange,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check duplicate (case-insensitive)
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setInputValue('');
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text');
    if (paste.includes(',')) {
      e.preventDefault();
      const parts = paste.split(',').map((p) => p.trim()).filter(Boolean);
      const newTags = [...tags];
      for (const p of parts) {
        if (!newTags.some((t) => t.toLowerCase() === p.toLowerCase())) {
          newTags.push(p);
        }
      }
      onChange(newTags);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 block">{label}</label>
        <span className="text-[11px] text-slate-400 font-medium">
          {tags.length} {tags.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-normal"
        />
        <button
          type="button"
          onClick={() => addTag(inputValue)}
          disabled={!inputValue.trim()}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Chips display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium transition-colors group"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(idx)}
                aria-label={`Remove ${tag}`}
                className="text-slate-400 hover:text-rose-600 focus:outline-none transition-colors cursor-pointer rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
