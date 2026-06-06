import React, { useState, Fragment, useId } from 'react';
import {
  Combobox,
  ComboboxInput as HeadlessInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, AlertCircle, AlertTriangle } from 'lucide-react';

export interface SuggestionItem<T = unknown> {
  label: string;
  value: string;
  data?: T;
  desc?: string;
}

interface ComboboxInputProps<T = unknown> {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect?: (item: SuggestionItem<T>) => void;
  options: SuggestionItem<T>[];
  className?: string;
  inputMode?: React.ComponentProps<'input'>['inputMode'];
  prefix?: React.ReactNode;
  id?: string;
  error?: string;
  warning?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ComboboxInput = <T = unknown,>({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  options,
  className,
  inputMode,
  prefix,
  id: providedId,
  error,
  warning,
  size = 'md',
}: ComboboxInputProps<T>) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [query, setQuery] = useState('');

  // Status Colors
  const statusClasses = error
    ? 'border-destructive focus:ring-destructive text-destructive'
    : warning
    ? 'border-warning focus:ring-warning text-warning-foreground'
    : 'border-input focus:ring-primary';

  const sizeClasses = {
    sm: { input: 'h-9 text-sm rounded-lg', label: 'text-sm' },
    md: { input: 'h-12 text-base rounded-xl', label: 'text-[15px]' },
    lg: { input: 'h-14 text-lg rounded-xl', label: 'text-base' },
  }[size];

  const filteredOptions =
    query === ''
      ? options
      : options.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className={cn(sizeClasses.label, "font-medium ml-1", error ? "text-destructive" : "text-foreground")}>
          {label}
        </label>
      )}
      
      <Combobox
        value={value}
        onChange={(val: string | null) => {
   // ถ้าเป็น null ให้ส่งค่าว่าง '' กลับไปแทน
   onChange(val || ''); 
	}}
        immediate
      >
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-background text-left shadow-sm focus:outline-none">
             {prefix && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
                  {prefix}
                </div>
             )}
            <HeadlessInput
              className={cn(
                'w-full border py-2 leading-5 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-background',
                sizeClasses.input,
                statusClasses,
                prefix ? 'pl-10' : 'pl-4',
                'pr-10',
                className
              )}
              displayValue={(val: string) => val}
              onChange={(event) => {
                setQuery(event.target.value);
                onChange(event.target.value);
              }}
              placeholder={placeholder}
              id={id}
              inputMode={inputMode}
              autoComplete="off"
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown
                className="h-5 w-5 text-muted-foreground/50"
                aria-hidden="true"
              />
            </ComboboxButton>
          </div>
          
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-popover py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none px-4 py-3 text-muted-foreground italic text-center">
                  ไม่พบข้อมูล "{query}"
                </div>
              ) : (
                filteredOptions.map((item) => (
                  <ComboboxOption
                    key={item.value}
                    className={({ active }) =>
                      cn(
                        'relative cursor-default select-none py-3 pl-10 pr-4 transition-colors',
                        active ? 'bg-accent text-foreground' : 'text-foreground'
                      )
                    }
                    value={item.label}
                    onClick={() => onSelect?.(item)}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex flex-col">
                          <span className={cn('block truncate font-medium', selected ? 'font-bold' : 'font-normal')}>
                            {item.label}
                          </span>
                          {item.desc && (
                            <span className={cn('text-xs truncate', active ? 'text-foreground/70' : 'text-muted-foreground')}>
                              {item.desc}
                            </span>
                          )}
                        </div>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-foreground">
                            <Check className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />
                          </span>
                        ) : null}
                      </>
                    )}
                  </ComboboxOption>
                ))
              )}
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>

      {error ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      ) : warning ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium text-warning-foreground">{warning}</span>
        </div>
      ) : null}
    </div>
  );
};