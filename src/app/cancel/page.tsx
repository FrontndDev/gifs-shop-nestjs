export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="p-8 rounded-lg border border-red-500/30 bg-slate-800/50">
        <h1 className="text-2xl font-semibold text-red-400 mb-2">Оплата отменена</h1>
        <p className="text-slate-300">Вы можете вернуться в приложение и попробовать ещё раз.</p>
      </div>
    </div>
  )
}


