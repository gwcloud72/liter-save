import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export type PageContainerSize = 'shell' | 'readable';

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  size?: PageContainerSize;
  padded?: boolean;
}

const containerWidthClasses: Record<PageContainerSize, string> = {
  shell: 'max-w-shell',
  readable: 'max-w-readable',
};

export function PageContainer({
  children,
  as: Component = 'div',
  size = 'shell',
  padded = true,
  className = '',
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={[
        'mx-auto w-full min-w-0',
        containerWidthClasses[size],
        padded ? 'px-page-mobile tablet:px-page-tablet wide:px-page-desktop' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface PageStackProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function PageStack({ children, className = '', ...props }: PageStackProps) {
  return (
    <div
      data-mobile-safe-content="true"
      className={[
        'min-w-0 space-y-section-mobile tablet:space-y-section-tablet desktop:space-y-section-desktop',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
}

export function PageSection({ children, as: Component = 'section', className = '', ...props }: PageSectionProps) {
  return (
    <Component
      className={[
        'min-w-0 space-y-card-mobile tablet:space-y-card-tablet desktop:space-y-card-desktop',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}
