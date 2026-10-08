/**
 * Custom MIS filter/form select — pill trigger + styled dropdown panel (not native OS popup).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IT_CTRL,
  IT_TYPE,
  IT_SURFACE,
} from '../itDesignTokens.js';
import { anchorFixedMenu } from '../../../lib/anchorFixedMenu.js';

/** Normalize string or { key/value, label } options for custom select menus. */
export function normalizeSelectOptions(options = []) {
  return (options || [])
    .map((opt) => {
      if (opt == null || opt === '') return null;
      if (typeof opt === 'string' || typeof opt === 'number') {
        const text = String(opt);
        return { value: text, label: text };
      }
      if (typeof opt === 'object') {
        const value = opt.value ?? opt.key ?? opt.id ?? opt._id ?? '';
        const label = opt.label ?? opt.Name ?? opt.name ?? String(value);
        if (!value && !label) return null;
        return { value: String(value), label: String(label) };
      }
      return null;
    })
    .filter(Boolean);
}

function itFormSelectTrigger(extra = '', open = false) {
  return [
    IT_CTRL.minHeight,
    'inline-flex w-full items-center justify-between gap-2',
    IT_CTRL.radius,
    IT_SURFACE.borderInput,
    'pl-3 pr-3',
    'text-sm font-medium text-slate-800',
    'outline-none',
    IT_CTRL.transition,
    'hover:border-slate-400',
    open ? 'border-[#0d9488] ring-2 ring-[#0d9488]/25' : '',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

function itFilterSelectTrigger(extra = '', open = false) {
  return [
    IT_CTRL.minHeight,
    'inline-flex w-full items-center justify-between gap-2',
    IT_CTRL.radiusPill,
    IT_SURFACE.borderFilter,
    'pl-3 pr-3',
    'text-sm font-semibold text-slate-800',
    'outline-none',
    IT_CTRL.transition,
    'hover:border-[#2dd4bf]',
    open ? 'border-[#0d9488] ring-2 ring-[#0d9488]/25' : '',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

function itHeaderSelectTrigger(extra = '', open = false) {
  return [
    IT_CTRL.minHeight,
    'inline-flex w-full min-w-[140px] items-center justify-between gap-2',
    IT_CTRL.radiusPill,
    'border border-white/35 bg-white/10',
    'pl-3 pr-3',
    'text-sm font-semibold text-white',
    'outline-none',
    IT_CTRL.transition,
    'hover:border-white/50 hover:bg-white/15',
    open ? 'border-white/60 bg-white/15 ring-2 ring-white/25' : '',
    'disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  ].filter(Boolean).join(' ');
}

function optionButtonClass(active) {
  return [
    'flex w-full items-center px-3 py-2 text-left text-sm font-medium transition-colors',
    active ? 'bg-gradient-to-r from-[#0d9488] to-[#059669] text-white' : 'text-slate-800 hover:bg-[#f0fdfa] hover:text-[#0f766e]',
  ].join(' ');
}

export default function ITMisSelectField({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'All',
  disabled = false,
  className = '',
  triggerClassName = '',
  showLabel = true,
  variant = 'filter',
  allowClear = true,
  toolbar = false,
  /** Project Tracker–style: uppercase label above white select (overrides toolbar sr-only). */
  stackedLabel = false,
  leadingIcon = null,
}) {
  const autoId = useId();
  const fieldId = id || `it-select-${autoId.replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const normalizedOptions = useMemo(() => normalizeSelectOptions(options), [options]);
  const isDisabled = disabled || normalizedOptions.length === 0;
  const isFilter = variant === 'filter';
  const isHeader = variant === 'header';
  const useStackedLayout = Boolean(stackedLabel || (showLabel && label && !isHeader && !toolbar));
  const LeadingIcon = leadingIcon;
  const labelVisible = Boolean(label) && showLabel && (useStackedLayout || (!isHeader && !toolbar));
  const labelSrOnly = Boolean(label) && !labelVisible;

  const selectedOption = normalizedOptions.find((opt) => opt.value === String(value ?? ''));
  const displayValue = selectedOption?.label || (value ? String(value) : placeholder);

  const triggerClass = isHeader
    ? itHeaderSelectTrigger(triggerClassName, open)
    : isFilter
      ? itFilterSelectTrigger(toolbar ? `${IT_CTRL.height} ${triggerClassName}` : triggerClassName, open)
      : itFormSelectTrigger(triggerClassName, open);

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle(anchorFixedMenu(rect, {
      minWidth: Math.max(rect.width, 140),
      maxWidth: Math.max(rect.width, 280),
      estimatedHeight: 224,
    }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      const menuEl = document.getElementById(`${fieldId}-menu`);
      if (rootRef.current?.contains(event.target) || menuEl?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, fieldId]);

  const pickValue = (next) => {
    onChange?.({ target: { value: next } });
    setOpen(false);
  };

  const menu = (
    <AnimatePresence>
      {open && menuStyle ? (
        <motion.div
          key="it-mis-select-menu"
          id={`${fieldId}-menu`}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={menuStyle}
          role="listbox"
          aria-labelledby={showLabel && label ? `${fieldId}-label` : undefined}
          className={`overflow-hidden rounded-xl border border-slate-200 bg-white py-1 ${IT_SURFACE.shadowDropdown}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <ul className="overflow-y-auto overscroll-contain py-0.5" style={{ maxHeight: Math.min(224, (menuStyle.maxHeight || 224) - 8) }}>
            {allowClear ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={optionButtonClass(!value)}
                  onClick={() => pickValue('')}
                >
                  {placeholder}
                </button>
              </li>
            ) : null}
            {normalizedOptions.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(value) === opt.value}
                  className={optionButtonClass(String(value) === opt.value)}
                  onClick={() => pickValue(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={[
        'relative flex min-w-[140px]',
        useStackedLayout ? 'flex-1 flex-col gap-1 sm:min-w-[11rem] sm:max-w-[220px] sm:flex-none' : 'shrink-0 items-center',
        className,
      ].filter(Boolean).join(' ')}
    >
      {labelVisible ? (
        <span
          id={`${fieldId}-label`}
          className={stackedLabel
            ? 'text-[10px] font-semibold uppercase tracking-wide text-slate-500'
            : IT_TYPE.label}
        >
          {label}
        </span>
      ) : null}
      {labelSrOnly ? (
        <span id={`${fieldId}-label`} className="sr-only">{label}</span>
      ) : null}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={!labelVisible ? label : undefined}
        onClick={() => !isDisabled && setOpen((v) => !v)}
        className={`${triggerClass} ${toolbar && !stackedLabel ? 'w-auto min-w-[7.5rem]' : 'w-full'} ${
          stackedLabel ? 'min-h-[2.25rem] rounded-xl border-slate-200/90 bg-white py-2 text-xs shadow-sm sm:text-sm' : ''
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {LeadingIcon ? (
            <LeadingIcon
              className={`h-3.5 w-3.5 shrink-0 ${isHeader ? 'text-white/85' : 'text-[#1E88E5]'}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
          <span className={`truncate ${!value ? 'text-slate-500' : isHeader ? 'text-white' : ''}`}>{displayValue}</span>
        </span>
        <ChevronDown className={`${IT_CTRL.iconSm} shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${
          isHeader ? 'text-white/80' : open ? 'text-[#0d9488]' : 'text-slate-400'
        }`}
        />
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
}
