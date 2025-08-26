import React from 'react'

export function Card({ className = '', children }: { className?: string, children: React.ReactNode }) {
  return <div className={`neon-card ${className}`}>{children}</div>
}

export default Card


