import { useEffect, useMemo, useState } from 'react'
import { X, Clipboard, Check, Download } from 'lucide-react'

interface DeckImportExportDialogProps {
  isOpen: boolean
  onClose(): void
  exportedText: string
  deckName: string
  onImport(text: string): Promise<{ errors: string[]; message: string }>
}

export function DeckImportExportDialog({
  isOpen,
  onClose,
  exportedText,
  deckName,
  onImport,
}: DeckImportExportDialogProps) {
  const [importText, setImportText] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [isImporting, setIsImporting] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  )
  const [errorList, setErrorList] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) {
      setImportText('')
      setCopyState('idle')
      setFeedback(null)
      setErrorList([])
    }
  }, [isOpen])

  const importDisabled = useMemo(() => importText.trim().length === 0 || isImporting, [importText, isImporting])

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(exportedText)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setFeedback({
        message: 'Unable to copy to clipboard. Please copy manually.',
        variant: 'error',
      })
    }
  }

  const handleDownload = () => {
    try {
      const blob = new Blob([exportedText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const safeName = (deckName || 'decklist').trim() || 'decklist'
      link.href = url
      link.download = `${safeName.replace(/[^a-z0-9-_]+/gi, '_')}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setFeedback({
        message: (error as Error).message ?? 'Unable to create download.',
        variant: 'error',
      })
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setFeedback(null)
    setErrorList([])
    try {
      const result = await onImport(importText)
      if (result.errors.length) {
        setErrorList(result.errors)
        setFeedback({ message: result.message, variant: 'error' })
      } else {
        setFeedback({ message: result.message, variant: 'success' })
        setTimeout(() => onClose(), 600)
      }
    } catch (error) {
      setFeedback({ message: (error as Error).message, variant: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'>
      <div className='w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-black/80'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-slate-500'>Deck IO</p>
            <h3 className='text-2xl font-semibold text-white'>Import / Export</h3>
          </div>
          <button
            className='rounded-full border border-slate-700/70 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white'
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className='mt-6 grid gap-6 md:grid-cols-2'>
          <div className='rounded-2xl border border-white/5 bg-slate-900/60 p-4'>
            <div className='flex items-center justify-between text-sm font-semibold text-white'>
              <span>Export current deck (Pokemon TCG format)</span>
              <div className='flex gap-2'>
                <button
                  className='inline-flex items-center gap-1 rounded-full border border-slate-600/60 px-2 py-1 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300'
                  onClick={handleCopy}
                >
                  {copyState === 'copied' ? (
                    <>
                      <Check size={14} /> Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={14} /> Copy
                    </>
                  )}
                </button>
                <button
                  className='inline-flex items-center gap-1 rounded-full border border-slate-600/60 px-2 py-1 text-xs text-slate-200 transition hover:border-sky-400 hover:text-sky-200'
                  onClick={handleDownload}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={exportedText}
              className='mt-3 h-64 w-full resize-none rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-xs font-mono text-slate-200'
            />
          </div>

          <div className='rounded-2xl border border-white/5 bg-slate-900/60 p-4'>
            <p className='text-sm font-semibold text-white'>Import from Pokemon TCG text format</p>
            <textarea
              className='mt-3 h-64 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none'
              placeholder='Paste a standard Pokemon TCG deck list here...'
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            <button
              className='mt-3 w-full rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400'
              disabled={importDisabled}
              onClick={handleImport}
            >
              {isImporting ? 'Importing...' : 'Import deck'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedback.variant === 'success'
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-400/60 bg-rose-500/10 text-rose-100'
            }`}
          >
            {feedback.message}
            {errorList.length > 0 && (
              <ul className='mt-2 list-disc space-y-1 pl-5 text-xs'>
                {errorList.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
