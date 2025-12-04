import type { PokemonCard } from '@/types/pokemon'
import { getLocalCardImage, imageErrorHandler } from '@/utils/cardImages'

interface CardDetailModalProps {
  card: PokemonCard
  onClose(): void
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'>
      <div className='relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-6 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl shadow-black/70'>
        <button
          className='absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-white'
          onClick={onClose}
        >
          Close
        </button>
        <div className='flex flex-col gap-6 lg:flex-row'>
          <div className='flex flex-col items-center gap-4 lg:w-1/2'>
            <img
              src={getLocalCardImage(card, 'large')}
              onError={imageErrorHandler(card, 'large')}
              alt={card.name}
              className='w-full max-w-sm rounded-2xl border border-white/10 shadow-lg shadow-black/50'
            />
            <div className='w-full rounded-2xl bg-slate-900/60 p-3 text-center text-sm text-slate-300'>
              <p>Set: <span className='font-semibold text-white'>{card.set?.name}</span></p>
              <p>#{card.number} • Regulation {card.regulationMark ?? '—'}</p>
            </div>
          </div>
          <div className='flex-1 space-y-4 text-left text-slate-100'>
            <header>
              <p className='text-xs uppercase tracking-[0.5em] text-emerald-300'>Card Detail</p>
              <h2 className='text-3xl font-extrabold text-white'>{card.name}</h2>
              <p className='text-sm text-slate-400'>
                {card.supertype}
                {card.subtypes?.length ? ` • ${card.subtypes.join(', ')}` : ''}
                {card.hp ? ` • HP ${card.hp}` : ''}
              </p>
            </header>
            {card.rules?.length ? (
              <section>
                <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-400'>Rules</h3>
                <ul className='mt-2 space-y-2 text-sm text-slate-200'>
                  {card.rules.map((rule) => (
                    <li key={rule} className='rounded-xl bg-slate-900/40 p-3'>{rule}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {card.attacks?.length ? (
              <section>
                <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-400'>Attacks</h3>
                <div className='mt-2 space-y-3'>
                  {card.attacks.map((attack) => (
                    <div key={attack.name} className='rounded-2xl border border-white/5 bg-slate-900/40 p-3 text-sm'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='font-semibold text-white'>{attack.name}</p>
                        <p className='text-slate-400'>{attack.damage}</p>
                      </div>
                      <p className='text-xs text-slate-300'>Cost: {(attack.cost ?? []).join(', ') || '—'}</p>
                      <p className='mt-1 text-slate-200'>{attack.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {card.abilities?.length ? (
              <section>
                <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-400'>Abilities</h3>
                <div className='mt-2 space-y-3'>
                  {card.abilities.map((ability) => (
                    <div key={ability.name} className='rounded-2xl border border-white/5 bg-emerald-500/10 p-3 text-sm'>
                      <p className='font-semibold text-emerald-200'>{ability.name}</p>
                      <p className='text-xs text-emerald-100'>[{ability.type}]</p>
                      <p className='mt-1 text-slate-100'>{ability.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section className='grid gap-3 md:grid-cols-2'>
              <div className='rounded-2xl border border-white/5 bg-slate-900/40 p-3 text-sm'>
                <h4 className='font-semibold text-slate-300'>Weaknesses</h4>
                <p className='text-slate-100'>{card.weaknesses?.map((w) => `${w.type} ${w.value}`).join(', ') || '—'}</p>
              </div>
              <div className='rounded-2xl border border-white/5 bg-slate-900/40 p-3 text-sm'>
                <h4 className='font-semibold text-slate-300'>Resistances</h4>
                <p className='text-slate-100'>{card.resistances?.map((w) => `${w.type} ${w.value}`).join(', ') || '—'}</p>
              </div>
              <div className='rounded-2xl border border-white/5 bg-slate-900/40 p-3 text-sm'>
                <h4 className='font-semibold text-slate-300'>Retreat Cost</h4>
                <p className='text-slate-100'>{card.retreatCost?.join(', ') || '—'}</p>
              </div>
              <div className='rounded-2xl border border-white/5 bg-slate-900/40 p-3 text-sm'>
                <h4 className='font-semibold text-slate-300'>Rarity</h4>
                <p className='text-slate-100'>{card.rarity ?? '—'}</p>
              </div>
            </section>
            {card.flavorText ? (
              <section className='rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-50'>
                “{card.flavorText}”
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
