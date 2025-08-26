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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-3xl p-6 rounded-xl border border-[rgba(96,165,250,0.35)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-[rgba(12,22,44,0.98)]">
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : <div />}
          {onClose && (
            <button onClick={onClose} className="text-sm text-[rgba(255,255,255,0.75)] hover:text-white">Close</button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal


