import React from 'react'

type ModalProps = {
  open: boolean
  onClose?: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="neon-card w-full max-w-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-lg font-semibold">{title}</h3> : <div />}
          {onClose && (
            <button onClick={onClose} className="text-sm text-[rgba(255,255,255,0.7)] hover:text-white">Close</button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal


