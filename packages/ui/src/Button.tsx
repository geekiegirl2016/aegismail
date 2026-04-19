import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-800',
  secondary:
    'border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900',
  ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-900',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = `px-3 py-2 rounded-md text-sm transition-colors ${VARIANT_CLASSES[variant]} ${className}`;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
