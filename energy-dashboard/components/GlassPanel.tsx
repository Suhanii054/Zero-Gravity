import { ReactNode } from 'react';
import { cn } from '@/utils/style';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export default function GlassPanel({ children, className, id }: GlassPanelProps) {
  return (
    <section id={id} className={cn('glass-panel rounded-xl p-4 sm:p-5', className)}>
      {children}
    </section>
  );
}
