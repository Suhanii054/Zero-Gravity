'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const didMount = useRef(false);

  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timeout = window.setTimeout(() => {
      if (draftStart && draftEnd && (draftStart !== startDate || draftEnd !== endDate)) {
        onChange(draftStart, draftEnd);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draftEnd, draftStart, endDate, onChange, startDate]);

  return (
    <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
      <CalendarDays className="h-4 w-4 text-accent-blue" />
      <input
        type="date"
        value={draftStart}
        onChange={(event) => setDraftStart(event.target.value)}
        className="w-[8.2rem] bg-transparent font-mono text-xs text-text-primary outline-none"
        aria-label="Forecast start date"
      />
      <span className="h-4 w-px bg-slate-200" />
      <input
        type="date"
        value={draftEnd}
        min={draftStart}
        onChange={(event) => setDraftEnd(event.target.value)}
        className="w-[8.2rem] bg-transparent font-mono text-xs text-text-primary outline-none"
        aria-label="Forecast end date"
      />
    </div>
  );
}
