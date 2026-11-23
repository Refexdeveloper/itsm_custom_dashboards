import { Download } from 'lucide-react';

/** Saves the current filtered record set to the device as Excel. */
export default function ITExportExcelButton({
  onClick,
  disabled = false,
  label = 'Export',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Export the filtered records to Excel"
      aria-label="Export the filtered records to Excel"
      className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
