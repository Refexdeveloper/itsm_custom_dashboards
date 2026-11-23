import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';
import { anchorFixedMenu } from '../../lib/anchorFixedMenu.js';

const LOCKED_KEYS = new Set(['expand', 'actions', 'viewDetails', 'takeAction']);

/** Fields that exist on the ticket but are not default table columns. Unchecked until the user adds them. */
export const SERVICE_EYE_EXTRA_COLUMNS = [
  { key: 'entity', label: 'Entity' },
  { key: 'requesterEmail', label: 'Requester Email' },
  { key: 'department', label: 'Department' },
  { key: 'location', label: 'Location' },
  { key: 'source', label: 'Source' },
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'subject', label: 'Subject' },
  { key: 'summary', label: 'Summary' },
  { key: 'description', label: 'Description' },
  { key: 'itemStatus', label: 'Item Status' },
  { key: 'sap', label: 'SAP' },
  { key: 'sapModule', label: 'SAP Module' },
  { key: 'holdReason', label: 'Reason for Hold' },
  { key: 'solution', label: 'Solution' },
];

export const CR_EYE_EXTRA_COLUMNS = [
  { key: 'summary', label: 'Summary' },
  { key: 'description', label: 'Description' },
  { key: 'department', label: 'Department' },
  { key: 'location', label: 'Location' },
  { key: 'changeReason', label: 'Change Reason' },
  { key: 'impact', label: 'Impact' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'onBehalfOf', label: 'On Behalf Of' },
  { key: 'plannedStart', label: 'Planned Start' },
  { key: 'plannedEnd', label: 'Planned End' },
  { key: 'implementationPlan', label: 'Implementation Plan' },
  { key: 'backoutPlan', label: 'Backout Plan' },
  { key: 'testPlan', label: 'Test Plan' },
  { key: 'currentStep', label: 'Current Step' },
  { key: 'itemStatus', label: 'Item Status' },
];

export const CEO_EYE_EXTRA_COLUMNS = [
  { key: 'ticketType', label: 'Request Type' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'summary', label: 'Subject' },
  { key: 'description', label: 'Description' },
  { key: 'company', label: 'Company' },
  { key: 'entity', label: 'Entity' },
];

export function serviceEyeExtraColumns({ includeSap = false } = {}) {
  if (includeSap) return SERVICE_EYE_EXTRA_COLUMNS;
  return SERVICE_EYE_EXTRA_COLUMNS.filter((col) => col.key !== 'sap' && col.key !== 'sapModule');
}

export function crEyeExtraColumns() {
  return CR_EYE_EXTRA_COLUMNS;
}

export function misColumnKey(col) {
  return String(col?.key || col?.id || '');
}

export function isMisDataColumn(col) {
  const key = misColumnKey(col);
  return Boolean(key) && !LOCKED_KEYS.has(key) && Boolean(String(col?.label || '').trim());
}

function mergeEyeColumns(columns, extraColumns) {
  const seen = new Set((columns || []).map(misColumnKey));
  const extras = [];
  for (const col of extraColumns || []) {
    const key = misColumnKey(col);
    if (!key || seen.has(key) || !isMisDataColumn(col)) continue;
    extras.push({ ...col, optional: true });
    seen.add(key);
  }
  const list = [...(columns || [])];
  let insertAt = list.length;
  while (insertAt > 0 && !isMisDataColumn(list[insertAt - 1])) insertAt -= 1;
  return [...list.slice(0, insertAt), ...extras, ...list.slice(insertAt)];
}

/** Hide or show table columns. Extra fields start hidden so the default table stays the same. */
export function useMisColumnVisibility(columns, extraColumns = []) {
  const eyeColumns = useMemo(
    () => mergeEyeColumns(columns, extraColumns),
    [columns, extraColumns],
  );
  const signature = eyeColumns.map((col) => `${misColumnKey(col)}:${col.optional ? 1 : 0}`).join('|');
  const [hidden, setHidden] = useState(() => new Set());
  const [added, setAdded] = useState(() => new Set());

  useEffect(() => {
    setHidden(new Set());
    setAdded(new Set());
  }, [signature]);

  const visibleColumns = useMemo(
    () => eyeColumns.filter((col) => {
      const key = misColumnKey(col);
      if (!isMisDataColumn(col)) return true;
      if (col.optional) return added.has(key);
      return !hidden.has(key);
    }),
    [eyeColumns, hidden, added],
  );

  const eyeHidden = useMemo(() => {
    const set = new Set(hidden);
    for (const col of eyeColumns) {
      const key = misColumnKey(col);
      if (col.optional && !added.has(key)) set.add(key);
    }
    return set;
  }, [eyeColumns, hidden, added]);

  const toggleColumn = (key) => {
    const col = eyeColumns.find((item) => misColumnKey(item) === key);
    if (!col || !isMisDataColumn(col)) return;
    if (col.optional) {
      setAdded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return;
    }
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      const stillVisible = eyeColumns.some((item) => {
        if (!isMisDataColumn(item) || misColumnKey(item) === key) return false;
        const itemKey = misColumnKey(item);
        if (item.optional) return added.has(itemKey);
        return !next.has(itemKey);
      });
      if (!stillVisible) return prev;
      next.add(key);
      return next;
    });
  };

  return { visibleColumns, eyeColumns, hidden: eyeHidden, toggleColumn };
}

export function optionalColumnMobileFields(columns, row, textOf) {
  return (columns || [])
    .filter((col) => col.optional && isMisDataColumn(col))
    .map((col) => ({ label: col.label, value: textOf(col, row) }));
}

export default function MisColumnEye({ columns = [], hidden, onToggle }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const fields = (columns || []).filter(isMisDataColumn);

  const updateMenuPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerWidth;
    setMenuStyle(anchorFixedMenu(rect, {
      minWidth: Math.min(288, Math.max(160, viewport - 24)),
      maxWidth: Math.min(320, Math.max(160, viewport - 24)),
      estimatedHeight: Math.min(420, window.innerHeight - 24),
      gutter: 12,
    }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
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
    if (!open) return undefined;
    const onPointer = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!fields.length) return null;

  const menu = open && menuStyle ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Table columns"
      style={menuStyle}
      className="overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 text-left shadow-lg"
    >
      {fields.map((col) => {
        const key = misColumnKey(col);
        const checked = !hidden.has(key);
        return (
          <label
            key={key}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium leading-snug text-slate-800 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-[var(--it-brand,#0f6b7a)]"
              checked={checked}
              onChange={() => onToggle(key)}
            />
            <span className="min-w-0 break-words">{col.label}</span>
          </label>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Show or hide columns"
        title="Show or hide columns"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
