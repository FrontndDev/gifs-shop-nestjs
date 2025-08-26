import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border border-[rgba(96,165,250,0.45)] bg-[rgba(20,36,72,0.9)] px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,211,238,0.7)] ${className}`}
      {...props}
    />
  )
})

export default Input


