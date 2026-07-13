'use client'

import { useMemo, useState, useId, useEffect, useRef } from 'react'
import { Signika } from 'next/font/google'
import Link from 'next/link'
import { enniaTheme } from '@/lib/demo-themes/ennia'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

const C = enniaTheme.colors
/** Soft radius — closer to ENNIA form controls than pills */
const R = '12px'
const Rsm = '8px'

const BENCHMARKS = {
  humanCostMid: 8,
  insuranceContainmentMid: 0.38,
  botCostMid: 1,
  partialResidual: 3,
  ahtAssist: 0.15,
  assistAdoption: 0.7,
} as const

function money(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function moneyExact(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export default function EnniaCaseStudyPage() {
  const [monthly, setMonthly] = useState(4000)
  const [costHuman, setCostHuman] = useState<number>(BENCHMARKS.humanCostMid)
  const [contain, setContain] = useState<number>(BENCHMARKS.insuranceContainmentMid)
  const [costAi, setCostAi] = useState<number>(BENCHMARKS.botCostMid)
  const [ahtCut, setAhtCut] = useState<number>(BENCHMARKS.ahtAssist)
  const [assistShare, setAssistShare] = useState<number>(BENCHMARKS.assistAdoption)
  const [mode, setMode] = useState<'A' | 'B' | 'AB'>('AB')

  const model = useMemo(() => {
    const annual = monthly * 12
    const baseline = annual * costHuman
    const contained = annual * contain
    const remainder = annual - contained
    const partial = remainder * 0.25
    const humanOnly = remainder - partial

    const costA =
      contained * costAi + partial * BENCHMARKS.partialResidual + humanOnly * costHuman
    const saveA = Math.max(0, baseline - costA)

    const costB =
      annual * assistShare * costHuman * (1 - ahtCut) +
      annual * (1 - assistShare) * costHuman
    const saveB = Math.max(0, baseline - costB)

    const costAB =
      contained * costAi +
      partial * BENCHMARKS.partialResidual +
      humanOnly * assistShare * costHuman * (1 - ahtCut) +
      humanOnly * (1 - assistShare) * costHuman
    const saveAB = Math.max(0, baseline - costAB)

    return {
      annual,
      baseline,
      contained,
      partial,
      humanOnly,
      costA,
      saveA,
      costB,
      saveB,
      costAB,
      saveAB,
      hoursFreed: (annual * assistShare * 8 * ahtCut) / 60,
      activeCost: mode === 'A' ? costA : mode === 'B' ? costB : costAB,
      activeSave: mode === 'A' ? saveA : mode === 'B' ? saveB : saveAB,
    }
  }, [monthly, costHuman, contain, costAi, ahtCut, assistShare, mode])

  return (
    <div className={`${signika.className} relative min-h-screen overflow-x-hidden`} style={{ color: C.text }}>
      {/* Atmospheric ENNIA field — soft mint like quote tools */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 10% -10%, ${C.greenAccent}66, transparent 50%),
            radial-gradient(ellipse 70% 50% at 100% 20%, ${C.greenLight}cc, transparent 45%),
            radial-gradient(ellipse 60% 40% at 50% 100%, ${C.greenBg}, transparent 55%),
            linear-gradient(165deg, #ffffff 0%, ${C.greenBg} 48%, #f7fbf2 100%)
          `,
        }}
      />

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes drawBar {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        .cs-fade {
          animation: fadeUp 0.65s ease-out both;
        }
        .cs-fade-d1 {
          animation: fadeUp 0.65s ease-out 0.1s both;
        }
        .cs-fade-d2 {
          animation: fadeUp 0.65s ease-out 0.2s both;
        }
        .glass {
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.72);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.85) inset,
            0 18px 40px -24px rgba(24, 61, 43, 0.28),
            0 2px 8px rgba(48, 126, 87, 0.06);
          backdrop-filter: blur(18px) saturate(1.35);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          border-radius: ${R};
        }
        .glass-strong {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(203, 222, 213, 0.65);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 22px 50px -28px rgba(24, 61, 43, 0.32);
          backdrop-filter: blur(22px) saturate(1.4);
          -webkit-backdrop-filter: blur(22px) saturate(1.4);
          border-radius: ${R};
        }
        .btn-ennia {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${Rsm};
          background: linear-gradient(180deg, #3b9070 0%, ${C.greenDark} 100%);
          color: #fff;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.65rem 1.15rem;
          border: 1px solid rgba(24, 61, 43, 0.15);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.22) inset,
            0 8px 18px -10px rgba(24, 61, 43, 0.55);
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }
        .btn-ennia:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.25) inset,
            0 12px 22px -10px rgba(24, 61, 43, 0.5);
        }
        .btn-ennia-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${Rsm};
          background: rgba(255, 255, 255, 0.55);
          color: ${C.greenDark};
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.65rem 1.15rem;
          border: 1px solid rgba(48, 126, 87, 0.28);
          backdrop-filter: blur(10px);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .btn-ennia-ghost:hover {
          background: rgba(238, 246, 229, 0.9);
          border-color: rgba(48, 126, 87, 0.45);
        }
        .field-glass {
          border-radius: ${Rsm};
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(203, 222, 213, 0.75);
          padding: 0.9rem 1rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field-glass:focus-within {
          border-color: rgba(48, 126, 87, 0.55);
          box-shadow: 0 0 0 3px rgba(48, 126, 87, 0.12);
          background: rgba(255, 255, 255, 0.78);
        }
        .cs-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, ${C.greenLight}, ${C.greenBorder});
          outline: none;
        }
        .cs-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(180deg, #4a9d78, ${C.greenDark});
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(24, 61, 43, 0.28);
          cursor: pointer;
        }
      `}</style>

      {/* Glass nav like online tooling chrome */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
          <div className="glass flex items-center justify-between px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <img
                src={enniaTheme.logo.green}
                alt="ENNIA"
                width={enniaTheme.logo.greenWidth}
                height={enniaTheme.logo.greenHeight}
                className="h-7 w-auto"
              />
              <span className="hidden h-4 w-px bg-[#CBDED5] sm:block" />
              <span className="hidden text-sm text-[#6B7280] sm:inline">Premium-style ROI tool</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="#calc" className="btn-ennia-ghost hidden sm:inline-flex">
                Calculate
              </a>
              <Link href="/chat" className="btn-ennia">
                Try Demi
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
        <div className="glass-strong cs-fade max-w-3xl p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#307E57]">
            Feel Secure · Service operations
          </p>
          <h1 className="cs-fade-d1 mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-[#183D2B] sm:text-5xl">
            Calculate the value of Demi for ENNIA
          </h1>
          <p className="cs-fade-d2 mt-4 max-w-xl text-base leading-relaxed text-[#6B7280] sm:text-lg">
            Same quiet clarity as ENNIA’s online premium tools — tuned for an ops business case.
            Adjust contacts and costs; see savings update like a quote.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#calc" className="btn-ennia">
              Open calculator
            </a>
            <a href="#model" className="btn-ennia-ghost">
              View models
            </a>
          </div>
        </div>
        <p className="mt-4 px-1 text-xs text-[#6B7280]">
          Illustrative ranges (insurance containment ~35–48%, contact cost ~$6–$12) — not ENNIA
          internal data.
        </p>
      </section>

      {/* Models as glass cards — wizard-step feel */}
      <section id="model" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <h2 className="mb-6 text-xl font-bold text-[#183D2B] sm:text-2xl">Choose a path</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode('A')
              document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`glass group p-6 text-left transition ${
              mode === 'A' ? 'ring-2 ring-[#307E57]/35' : 'hover:bg-white/70'
            }`}
          >
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[#307E57]/12 px-2 text-xs font-bold text-[#307E57]">
              A
            </span>
            <h3 className="mt-3 text-lg font-bold text-[#183D2B]">Customer chat</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
              Automate repetitive FAQs & route claims / sales / support. Humans keep judgment calls.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#307E57]">Insurance containment ~35–48% →</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('B')
              document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`glass group p-6 text-left transition ${
              mode === 'B' ? 'ring-2 ring-[#307E57]/35' : 'hover:bg-white/70'
            }`}
          >
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[#307E57]/12 px-2 text-xs font-bold text-[#307E57]">
              B
            </span>
            <h3 className="mt-3 text-lg font-bold text-[#183D2B]">Desk copilot</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
              Knowledge beside agents — drafts, lookup, summaries. Capacity up; accountability stays human.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#307E57]">Peer assist AHT cuts ~15% →</p>
          </button>
        </div>
      </section>

      {/* Calculator — quote-form layout */}
      <section id="calc" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#183D2B] sm:text-2xl">Your estimate</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Step through inputs — results refresh live.</p>
          </div>
          <ModeTabs mode={mode} onChange={setMode} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
          {/* Spec panel */}
          <div className="glass-strong p-5 sm:p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#307E57]">
              Specification
            </p>
            <div className="space-y-3">
              <Range
                label="Monthly contacts"
                value={monthly}
                min={800}
                max={20000}
                step={100}
                display={monthly.toLocaleString()}
                onChange={setMonthly}
              />
              <Range
                label="Cost per human contact"
                value={costHuman}
                min={4}
                max={14}
                step={0.25}
                display={moneyExact(costHuman)}
                onChange={setCostHuman}
              />
              {(mode === 'A' || mode === 'AB') && (
                <>
                  <Range
                    label="AI containment"
                    value={contain}
                    min={0.25}
                    max={0.5}
                    step={0.01}
                    display={pct(contain)}
                    onChange={setContain}
                  />
                  <Range
                    label="Cost per AI resolution"
                    value={costAi}
                    min={0.25}
                    max={2}
                    step={0.05}
                    display={moneyExact(costAi)}
                    onChange={setCostAi}
                  />
                </>
              )}
              {(mode === 'B' || mode === 'AB') && (
                <>
                  <Range
                    label="Handle-time reduction"
                    value={ahtCut}
                    min={0.1}
                    max={0.26}
                    step={0.01}
                    display={pct(ahtCut)}
                    onChange={setAhtCut}
                  />
                  <Range
                    label="Assist adoption"
                    value={assistShare}
                    min={0.4}
                    max={1}
                    step={0.05}
                    display={pct(assistShare)}
                    onChange={setAssistShare}
                  />
                </>
              )}
            </div>
          </div>

          {/* Quote result panel */}
          <div className="glass-strong relative overflow-hidden p-5 sm:p-7">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40"
              style={{ background: `radial-gradient(circle, ${C.greenAccent}, transparent 70%)` }}
            />
            <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-[#307E57]">
              Indicative annual savings
            </p>
            <CountUp className="relative mt-2 text-5xl font-bold tracking-tight text-[#183D2B] sm:text-6xl">
              {model.activeSave}
            </CountUp>
            <p className="relative mt-2 text-sm text-[#6B7280]">
              Baseline {money(model.baseline)} · {pct(model.activeSave / Math.max(model.baseline, 1))} of
              spend
            </p>

            <div className="relative mt-8 space-y-4">
              <CompareBars
                baseline={model.baseline}
                selected={model.activeCost}
                selectedLabel={
                  mode === 'A' ? 'With chat' : mode === 'B' ? 'With assist' : 'Combined path'
                }
              />
            </div>

            {(mode === 'A' || mode === 'AB') && (
              <div className="relative mt-8 flex items-center gap-5 border-t border-[#CBDED5]/70 pt-6">
                <Donut
                  parts={[
                    { value: model.contained, color: C.greenDark, label: 'Contained' },
                    { value: model.partial, color: C.greenAccent, label: 'Partial' },
                    { value: model.humanOnly, color: C.greenDarker, label: 'Human' },
                  ]}
                />
                <div className="space-y-2 text-sm">
                  <LegendDot color={C.greenDark} label="AI resolved" n={model.contained} />
                  <LegendDot color={C.greenAccent} label="Hybrid" n={model.partial} />
                  <LegendDot color={C.greenDarker} label="Human" n={model.humanOnly} />
                </div>
              </div>
            )}

            {mode === 'B' && (
              <p className="relative mt-6 border-t border-[#CBDED5]/70 pt-5 text-sm text-[#6B7280]">
                ≈{' '}
                <strong className="text-[#183D2B]">
                  {Math.round(model.hoursFreed).toLocaleString()} agent-hours
                </strong>{' '}
                / year (8‑min AHT assumption)
              </p>
            )}

            {mode === 'AB' && (
              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Chat alone" value={money(model.saveA)} />
                <MiniStat label="Assist alone" value={money(model.saveB)} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Peer stats — glass row */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="glass p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#183D2B]">Revenue peers — measure before claiming</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Fact num="~11%" label="After-hours conversion" detail="AA Ireland quote bot" />
            <Fact num="~13%" label="Digital conversion lift" detail="ACKO GenAI chat" />
            <Fact num="PA" label="Local-language trust" detail="Demi · Curaçao orthography" />
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="glass-strong flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-lg font-bold text-[#183D2B]">Continue like a live quote flow</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Open Demi or the ENNIA demo workspace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/chat" className="btn-ennia">
              Open chat
            </Link>
            <Link href="/demo/ennia/login" className="btn-ennia-ghost">
              Demo login
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6">
        <div className="glass px-5 py-5 text-xs leading-relaxed text-[#6B7280]">
          <p className="font-semibold text-[#307E57]">Sources</p>
          <p className="mt-2">
            Containment 35–48% (Forrester CX syntheses) · Human ~$6–$12 / AI ~$0.25–$2 (Gartner / IBM /
            NICE ranges) · Assist −15% AHT (Foundever) · AA Ireland ~+11% · ACKO ~+13%
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-[#CBDED5]/60 pt-4">
            <img src={enniaTheme.logo.green} alt="ENNIA" className="h-5 w-auto opacity-80" />
            <span>Astute · Feel Secure</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: 'A' | 'B' | 'AB'
  onChange: (m: 'A' | 'B' | 'AB') => void
}) {
  const items: { id: 'A' | 'B' | 'AB'; label: string }[] = [
    { id: 'A', label: 'Chat' },
    { id: 'B', label: 'Assist' },
    { id: 'AB', label: 'Both' },
  ]
  return (
    <div
      className="inline-flex p-1"
      style={{
        borderRadius: Rsm,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(203,222,213,0.8)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className="px-4 py-1.5 text-sm font-semibold transition"
          style={{
            borderRadius: '6px',
            background: mode === item.id ? C.greenDark : 'transparent',
            color: mode === item.id ? '#fff' : C.textMuted,
            boxShadow: mode === item.id ? '0 6px 14px -8px rgba(24,61,43,0.5)' : 'none',
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (n: number) => void
}) {
  const id = useId()
  return (
    <div className="field-glass">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-[#183D2B]">
          {label}
        </label>
        <span className="rounded bg-[#307E57]/10 px-2 py-0.5 text-sm font-bold text-[#307E57]">
          {display}
        </span>
      </div>
      <input
        id={id}
        className="cs-range w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function CompareBars({
  baseline,
  selected,
  selectedLabel,
}: {
  baseline: number
  selected: number
  selectedLabel: string
}) {
  const max = Math.max(baseline, selected, 1)
  return (
    <div className="space-y-4">
      <BarRow label="Baseline (all human)" value={baseline} max={max} color={C.greenDarker} />
      <BarRow label={selectedLabel} value={selected} max={max} color={C.greenDark} />
    </div>
  )
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-[#6B7280]">
        <span>{label}</span>
        <span className="font-semibold text-[#183D2B]">{money(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded bg-[#CBDED5]/45">
        <div
          className="h-full origin-left rounded"
          style={{
            width: `${Math.max(6, (value / max) * 100)}%`,
            backgroundColor: color,
            animation: 'drawBar 0.8s ease-out both',
          }}
        />
      </div>
    </div>
  )
}

function Donut({ parts }: { parts: { value: number; color: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  let cursor = 0
  const stops = parts
    .map((p) => {
      const start = cursor
      const share = (p.value / total) * 100
      cursor += share
      return `${p.color} ${start}% ${cursor}%`
    })
    .join(', ')

  return (
    <div
      className="h-28 w-28 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${stops})`,
        boxShadow: 'inset 0 0 0 20px rgba(255,255,255,0.92)',
      }}
      role="img"
      aria-label={parts.map((p) => p.label).join(', ')}
    />
  )
}

function LegendDot({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2 text-[#6B7280]">
      <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: color }} />
      <span>
        {label}{' '}
        <strong className="font-semibold text-[#183D2B]">{Math.round(n).toLocaleString()}</strong>
      </span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-glass !py-3">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-[#307E57]">{value}</p>
    </div>
  )
}

function Fact({ num, label, detail }: { num: string; label: string; detail: string }) {
  return (
    <div>
      <p className="text-3xl font-bold tracking-tight text-[#307E57]">{num}</p>
      <p className="mt-2 font-semibold text-[#183D2B]">{label}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{detail}</p>
    </div>
  )
}

function CountUp({ children, className }: { children: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const from = prev.current
    const to = children
    prev.current = to
    const start = performance.now()
    const dur = 650
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [children])

  return <p className={className}>{money(display)}</p>
}
