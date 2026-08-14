import { AnimatePresence, motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import { IT_TYPE } from '../../../components/it/itDesignTokens.js';

/** Centered ITSM loading state for Refex dashboards. */
export default function RefexEmployeeCenterLoader({
  loading = false,
  message = 'Loading your requests...',
  submessage = 'Please wait while we fetch your tickets',
}) {
  return (
    <AnimatePresence>
      {loading ? (
        <motion.div
          key="refex-employee-center-loader"
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--it-brand-soft)] ring-1 ring-[var(--it-brand-border)]">
              <Headphones className="h-7 w-7 animate-pulse text-[var(--it-brand-primary)]" />
            </div>
            <p className={`${IT_TYPE.sectionTitle} text-slate-700`}>{message}</p>
            <p className={IT_TYPE.meta}>{submessage}</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
