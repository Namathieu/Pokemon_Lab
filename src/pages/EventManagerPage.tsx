import { useState } from 'react'
import { useDeckLibraryStore } from '@/state/useDeckLibraryStore'

export function EventManagerPage() {
  const events = useDeckLibraryStore((state) => state.events)
  const addEvent = useDeckLibraryStore((state) => state.addEvent)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <p className='text-xs uppercase tracking-[0.4em] text-emerald-300'>Event Manager</p>
        <h2 className='mt-2 text-3xl font-bold text-white'>Create and manage events</h2>
        <p className='mt-2 max-w-3xl text-sm text-slate-300'>
          Add events (tournaments) with dates. These are used when importing decks in the Deck Library.
        </p>
        <div className='mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]'>
          <input
            className='rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
            placeholder='Event name (e.g., Regional Stuttgart)'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type='date'
            className='rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className='rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400'
            onClick={() => {
              if (!name.trim()) return
              addEvent({ name, date })
              setName('')
              setDate('')
            }}
            disabled={!name.trim()}
          >
            Add event
          </button>
        </div>
      </div>

      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <div className='flex items-center justify-between'>
          <h3 className='text-2xl font-semibold text-white'>Existing events</h3>
          <p className='text-sm text-slate-400'>Total: {events.length}</p>
        </div>
        {events.length === 0 ? (
          <p className='mt-3 text-sm text-slate-400'>No events yet. Create one above.</p>
        ) : (
          <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {events.map((evt) => (
              <div
                key={evt.id}
                className='rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-100'
              >
                <p className='text-base font-semibold text-white'>{evt.name}</p>
                <p className='text-xs text-slate-400'>
                  {evt.date ? `Date: ${evt.date}` : 'Date not set'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
