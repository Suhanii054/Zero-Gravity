'use client';

import { CalendarClock } from 'lucide-react';

function apiToInputValue(value: string) {
  if (!value) return '';
  const [year, month, day, hour = '00'] = value.split('-');
  return `${year}-${month}-${day}T${hour.padStart(2, '0')}:00`;
}

function inputToApiValue(value: string) {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

export default function DateTimeRangePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-text-secondary shadow-sm">
      <CalendarClock className="h-4 w-4 text-accent-blue" />
      <span className="hidden font-bold text-text-primary 2xl:inline">Forecast Time</span>
      <input
        type="datetime-local"
        value={apiToInputValue(value)}
        onChange={(event) => onChange(inputToApiValue(event.target.value))}
        className="w-[178px] bg-transparent font-mono text-xs text-text-primary outline-none"
      />
    </label>
  );
}
