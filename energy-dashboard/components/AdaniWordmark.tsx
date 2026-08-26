import { cn } from '@/utils/style';

interface AdaniWordmarkProps {
  className?: string;
}

export default function AdaniWordmark({ className }: AdaniWordmarkProps) {
  return (
    <span
      className={cn(
        'adani-wordmark inline-block select-none font-sans text-4xl font-black lowercase leading-none tracking-normal',
        className,
      )}
      aria-label="Adani"
    >
      adani
    </span>
  );
}
