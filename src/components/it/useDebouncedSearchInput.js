import { useEffect, useRef, useState } from 'react';

/** Keep typing instant; delay the parent filter so mobile search does not hitch. */
export const SEARCH_DEBOUNCE_MS = 220;

export function useDebouncedSearchInput(value, onChange, delayMs = SEARCH_DEBOUNCE_MS) {
  const [local, setLocal] = useState(value ?? '');
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const emit = (next) => {
    onChangeRef.current?.({ target: { value: next } });
  };

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (String(local) !== String(value ?? '')) emit(local);
  };

  const handleChange = (event) => {
    const next = event?.target?.value ?? '';
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      emit(next);
    }, delayMs);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') flush();
  };

  return {
    value: local,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: flush,
  };
}
