import React, { useState, useEffect, useRef } from 'react';

export type TagInputFieldProps = {
  value?: string[] | string;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
};

export function TagInputField({
  value,
  onChange,
  placeholder = 'Type tags separated by commas (e.g. Water Resource, Groundwater, Climate Change)',
  className = 'input',
  id,
  name,
  disabled = false
}: TagInputFieldProps) {
  const formatPropValue = (val?: string[] | string): string => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
    return '';
  };

  const [rawInput, setRawInput] = useState<string>(() => formatPropValue(value));
  const isFocusedRef = useRef(false);

  // Synchronize internal draft when prop value changes externally (e.g. switching records)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setRawInput(formatPropValue(value));
    }
  }, [value]);

  const parseTags = (text: string): string[] => {
    return text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setRawInput(nextVal);
    // Notify parent immediately with cleanly parsed tags without mutating rawInput
    const parsed = parseTags(nextVal);
    onChange(parsed);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const parsed = parseTags(rawInput);
    onChange(parsed);
    // On blur, format rawInput cleanly so trailing dangling commas are settled
    setRawInput(parsed.join(', '));
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent accidental premature submission of modal forms on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseTags(rawInput);
      onChange(parsed);
      setRawInput(parsed.length > 0 ? `${parsed.join(', ')}, ` : '');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const currentTags = parseTags(rawInput);
    const updatedTags = currentTags.filter((_, idx) => idx !== indexToRemove);
    const updatedString = updatedTags.join(', ');
    setRawInput(updatedString);
    onChange(updatedTags);
  };

  const activeTags = parseTags(rawInput);

  return (
    <div className="tag-input-field-wrapper w-full box-border">
      <input
        type="text"
        id={id}
        name={name}
        className={className}
        value={rawInput}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {activeTags.length > 0 && (
        <div className="tag-pills-preview flex flex-wrap gap-1.5 mt-2" aria-label="Selected tags preview">
          {activeTags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs transition-all hover:border-emerald-300"
            >
              <span>{tag}</span>
              <button
                type="button"
                className="text-emerald-600 hover:text-emerald-950 hover:bg-emerald-200/80 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                onClick={() => handleRemoveTag(idx)}
                title={`Remove "${tag}"`}
                aria-label={`Remove "${tag}"`}
                disabled={disabled}
              >
                ×
              </button>
            </span>
          ))}
          <span className="text-[11px] text-gray-500 self-center ml-1 font-medium">
            ({activeTags.length} {activeTags.length === 1 ? 'tag' : 'tags'})
          </span>
        </div>
      )}
    </div>
  );
}
