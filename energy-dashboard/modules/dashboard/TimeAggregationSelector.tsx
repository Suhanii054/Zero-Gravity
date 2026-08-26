'use client';

import { Layers3 } from 'lucide-react';
import { TimeAggregation } from '@/types/energy';

const options: Array<{ value: TimeAggregation; label: string }> = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function TimeAggregationSelector({
  value,
  onChange,
}: {
  value: TimeAggregation;
  onChange: (value: TimeAggregation) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-text-secondary shadow-sm">
      <Layers3 className="h-4 w-4 text-accent-magenta" />
      <span className="font-black text-text-primary">Resolution</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TimeAggregation)}
        className="bg-transparent font-mono text-xs text-text-primary outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
