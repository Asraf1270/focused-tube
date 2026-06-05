import { useIsMobile } from '@/hooks/useMediaQuery';

export default function MobileVideoGrid({ children }) {
  const isMobile = useIsMobile();

  return (
    <div className={`
      grid gap-3
      ${isMobile 
        ? 'grid-cols-1 px-2' 
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
      }
    `}>
      {children}
    </div>
  );
}