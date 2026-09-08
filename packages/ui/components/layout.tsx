import type { HTMLAttributes, ReactNode } from 'react';
import { lightbiDensityClasses, type LightBIDensity } from './density';

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export interface CanvasProps extends HTMLAttributes<HTMLDivElement> {
  density?: LightBIDensity;
}

export function Canvas({ density = 'working', className, ...props }: CanvasProps) {
  return <div
    data-lightbi-canvas="true"
    data-density={density}
    className={classes(
      'flex w-full flex-col bg-[var(--lb-canvas)] px-[var(--lb-space-4)] sm:px-[var(--lb-space-6)] lg:px-[var(--lb-space-8)]',
      lightbiDensityClasses[density].canvasGap,
      className,
    )}
    {...props}
  />;
}
export interface SectionProps extends HTMLAttributes<HTMLElement> {
  density?: LightBIDensity;
  separated?: boolean;
}

export function Section({ density = 'working', separated = true, className, ...props }: SectionProps) {
  return <section
    data-lightbi-section="true"
    data-density={density}
    className={classes(
      'flex flex-col',
      lightbiDensityClasses[density].sectionGap,
      lightbiDensityClasses[density].sectionPadding,
      separated && 'border-t border-[var(--lb-divider)] first:border-t-0',
      className,
    )}
    {...props}
  />;
}

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}
export function SectionHeader({
  title, description, eyebrow, actions, headingLevel = 2, className, ...props
}: SectionHeaderProps) {
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 3 ? 'h3' : 'h2';
  return <div className={classes('flex min-w-0 items-start justify-between gap-[var(--lb-space-4)]', className)} {...props}>
    <div className="min-w-0">
      {eyebrow && <div className="mb-[var(--lb-space-1)] text-[var(--lb-text-caption)] font-semibold uppercase tracking-[0.08em] text-[var(--lb-ink-muted)]">{eyebrow}</div>}
      <Heading className="text-[var(--lb-text-page-title)] font-semibold leading-tight text-[var(--lb-ink)]">{title}</Heading>
      {description && <div className="mt-[var(--lb-space-1)] max-w-3xl text-[var(--lb-text-body-sm)] leading-5 text-[var(--lb-ink-secondary)]">{description}</div>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-[var(--lb-space-2)]">{actions}</div>}
  </div>;
}

export interface InsetProps extends HTMLAttributes<HTMLDivElement> {
  density?: LightBIDensity;
}

export function Inset({ density = 'working', className, ...props }: InsetProps) {
  return <div
    data-lightbi-inset="true"
    data-density={density}
    className={classes('border-l-2 border-[var(--lb-divider)] bg-[var(--lb-surface-subtle)] px-[var(--lb-space-4)] py-[var(--lb-space-3)]', className)}
    {...props}
  />;
}
export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr
    aria-hidden="true"
    className={classes('m-0 border-0 border-t border-[var(--lb-divider)]', className)}
    {...props}
  />;
}
