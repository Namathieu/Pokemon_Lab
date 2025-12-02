import type { CardSearchFilters } from '@/types/pokemon'
import { Download, RefreshCcw } from 'lucide-react'

const SUPERTYPES = ['Pokémon', 'Trainer', 'Energy']
const REGULATION_MARKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const STAGES = ['Basic', 'Stage 1', 'Stage 2', 'Level-Up', 'BREAK', 'MEGA', 'Restored', 'VMAX', 'VSTAR']

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

interface SetOption {
  id: string
  name: string
}

interface FilterPanelProps {
  filters: CardSearchFilters
  onChange(filters: CardSearchFilters): void
  onReset(): void
  sets: SetOption[]
  types: string[]
  libraryStatus: {
    count: number
    generatedAt?: string
    isLoading: boolean
  }
  onReloadLibrary(): void
}

function SupertypePills({
  selected,
  onSelect,
}: {
  selected: string
  onSelect(value: string): void
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      <button
        className={`rounded-full border px-3 py-1 text-sm transition ${
          selected === '' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : 'border-slate-600 text-slate-300 hover:border-slate-500'
        }`}
        onClick={() => onSelect('')}
      >
        All Cards
      </button>
      {SUPERTYPES.map((supertype) => (
        <button
          key={supertype}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            selected === supertype ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : 'border-slate-600 text-slate-300 hover:border-slate-500'
          }`}
          onClick={() => onSelect(selected === supertype ? '' : supertype)}
        >
          {supertype}
        </button>
      ))}
    </div>
  )
}

function formatGeneratedAt(timestamp?: string) {
  if (!timestamp) return 'Unknown sync date'
  const date = new Date(timestamp)
  return `Updated ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
  sets,
  types,
  libraryStatus,
  onReloadLibrary,
}: FilterPanelProps) {
  return (
    <section className='rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>Filters</p>
          <h2 className='mt-1 text-lg font-semibold text-white'>Search Pokémon Cards</h2>
        </div>
        <div className='flex gap-2'>
          <button
            className='inline-flex items-center gap-1 rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white'
            onClick={onReset}
          >
            <RefreshCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div className='mt-4 space-y-4 text-sm'>
        <div className='rounded-2xl border border-white/5 bg-slate-900/60 p-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Card Library</p>
          <p className='mt-1 text-base text-white'>
            {libraryStatus.count > 0
              ? `${libraryStatus.count.toLocaleString()} cards loaded`
              : 'No cards loaded'}
          </p>
          <p className='text-xs text-slate-400'>
            {libraryStatus.isLoading
              ? 'Loading local card bundle…'
              : `Run "npm run sync:cards" to refresh the bundle, then reload below.`}
          </p>
          <p className='mt-1 text-xs text-slate-500'>{formatGeneratedAt(libraryStatus.generatedAt)}</p>
          <button
            className='mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10'
            onClick={onReloadLibrary}
          >
            <Download size={14} />
            Reload local bundle
          </button>
        </div>

        <label className='block'>
          <span className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Card Name</span>
          <input
            type='text'
            className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none'
            placeholder='Search by name, e.g. “Charizard ex”'
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
          />
        </label>

        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Supertype</p>
          <div className='mt-2'>
            <SupertypePills
              selected={filters.supertype}
              onSelect={(value) => onChange({ ...filters, supertype: value })}
            />
          </div>
        </div>

        <div>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Types</div>
          <div className='mt-2 flex flex-wrap gap-2'>
            {types.map((type) => {
              const active = filters.types.includes(type)
              return (
                <button
                  key={type}
                  type='button'
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                  onClick={() => onChange({ ...filters, types: toggleValue(filters.types, type) })}
                >
                  {type}
                </button>
              )
            })}
          </div>
          <p className='mt-1 text-xs text-slate-500'>Select multiple to find dual-typed Pokémon.</p>
        </div>

        <label className='block'>
          <span className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Set</span>
          <select
            className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none'
            value={filters.setId}
            onChange={(event) => onChange({ ...filters, setId: event.target.value })}
          >
            <option value=''>Any Standard Set</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </label>

        <label className='flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-200'>
          <input
            type='checkbox'
            className='h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-400'
            checked={filters.standardOnly}
            onChange={(event) => onChange({ ...filters, standardOnly: event.target.checked })}
          />
          Show Standard cards only
        </label>

        <div>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Regulation marks</div>
          <div className='mt-2 flex flex-wrap gap-2'>
            {REGULATION_MARKS.map((mark) => {
              const active = filters.regulationMarks.includes(mark)
              return (
                <button
                  type='button'
                  key={mark}
                  className={`rounded-lg border px-2 py-1 text-sm font-semibold transition ${
                    active
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                      : 'border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    const next = active
                      ? filters.regulationMarks.filter((value) => value !== mark)
                      : [...filters.regulationMarks, mark]
                    onChange({ ...filters, regulationMarks: next })
                  }}
                >
                  {mark}
                </button>
              )
            })}
          </div>
          <p className='mt-1 text-xs text-slate-500'>
            Leave unselected to include every mark. Combine with “Standard only” for G/H/I defaults.
          </p>
        </div>

        <div>
          <div className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Stages</div>
          <div className='mt-2 flex flex-wrap gap-2'>
            {STAGES.map((stage) => {
              const active = filters.stages.includes(stage)
              return (
                <button
                  key={stage}
                  type='button'
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                  onClick={() => onChange({ ...filters, stages: toggleValue(filters.stages, stage) })}
                >
                  {stage}
                </button>
              )
            })}
          </div>
          <p className='mt-1 text-xs text-slate-500'>Matches cards whose subtypes include the selected stage.</p>
        </div>

        <label className='block'>
          <span className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Sort</span>
          <select
            className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none'
            value={filters.sort}
            onChange={(event) => onChange({ ...filters, sort: event.target.value as CardSearchFilters['sort'] })}
          >
            <option value='name-asc'>Name A → Z</option>
            <option value='release-desc'>Newest sets first</option>
          </select>
        </label>
      </div>
    </section>
  )
}
