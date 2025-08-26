import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
}
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[linear-gradient(90deg,rgba(45,212,255,0.2),rgba(96,165,250,0.2))] border border-[rgba(45,212,255,0.45)] text-white hover:border-[rgba(45,212,255,0.8)]',
  secondary: 'bg-[rgba(255,255,255,0.06)] border border-[rgba(96,165,250,0.35)] text-white hover:bg-[rgba(255,255,255,0.1)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-500',
  ghost: 'bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)] border border-transparent',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  )
}

export default Button


