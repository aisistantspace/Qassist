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

/** Industry ranges used as defaults — cited in Sources. */
const BENCHMARKS = {
  humanCostMid: 8,
  insuranceContainmentMid: 0.38,
  botCostMid: 1,
  partialResidual: 3,
  ahtAssist: 0.15,
  assistAdoption: 0.7,
  afterHoursLift: 0.11,
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
  const [costHuman, setCostHuman] = useState(BENCHMARKS.humanCostMid)
  const [contain, setContain] = useState(BENCHMARKS.insuranceContainmentMid)
  const [costAi, setCostAi] = useState(BENCHMARKS.botCostMid)
  const [ahtCut, setAhtCut] = useState(BENCHMARKS.ahtAssist)
  const [assistShare, setAssistShare] = useState(BENCHMARKS.assistAdoption)
  const [mode, setMode] = useState<'A' | 'B' | 'AB'>('AB')

  const model = useMemo(() => {
    const annual = monthly * 12
    const baseline = annual * costHuman
    const contained = annual * contain
    const remainder = annual - contained
    const partial = remainder * 0.25
    const humanOnly = remainder - partial

    const costA =
      contained * costAi +
      partial * BENCHMARKS.partialResidual +
      humanOnly * costHuman
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

    const hoursFreed = (annual * assistShare * 8 * ahtCut) / 60

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
      hoursFreed,
      activeCost: mode === 'A' ? costA : mode === 'B' ? costB : costAB,
      activeSave: mode === 'A' ? saveA : mode === 'B' ? saveB : saveAB,
    }
  }, [monthly, costHuman, contain, costAi, ahtCut, assistShare, mode])

  return (
    <div
      className={`${signika.className} min-h-screen`}
      style={{
        color: C.text,
        background: `linear-gradient(180deg, #FFFFFF 0%, ${C.greenBg} 42%, #FFFFFF 100%)`,
      }}
    >
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
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
          animation: fadeUp 0.7s ease-out both;
        }
        .cs-fade-delay {
          animation: fadeUp 0.7s ease-out 0.12s both;
        }
        .cs-fade-delay-2 {
          animation: fadeUp 0.7s ease-out 0.24s both;
        }
        .cs-range {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 999px;
          background: ${C.greenBorder};
          outline: none;
        }
        .cs-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${C.greenDark};
          border: 3px solid #fff;
          box-shadow: 0 1px 4px rgb(24 61 43 / 0.25);
          cursor: pointer;
        }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#CBDED5]/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src={enniaTheme.logo.green}
              alt="ENNIA"
              width={enniaTheme.logo.greenWidth}
              height={enniaTheme.logo.greenHeight}
              className="h-7 w-auto"
            />
            <span className="hidden h-5 w-px bg-[#CBDED5] sm:block" />
            <span className="hidden text-sm text-[#6B7280] sm:inline">Service case study</span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#model" className="rounded px-3 py-1.5 text-[#307E57] hover:bg-[#EEF6E5]">
              Models
            </a>
            <a href="#calc" className="rounded px-3 py-1.5 text-[#307E57] hover:bg-[#EEF6E5]">
              Calculator
            </a>
            <Link
              href="/chat"
              className="rounded bg-[#307E57] px-3.5 py-1.5 font-semibold text-white hover:bg-[#183D2B]"
            >
              Try Demi
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — light */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 15% 0%, ${C.greenAccent}55, transparent 55%),
              radial-gradient(ellipse 55% 45% at 95% 30%, ${C.greenLight}88, transparent 50%),
              linear-gradient(180deg, #fff 0%, ${C.greenBg} 100%)
            `,
          }}
        />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <p className="cs-fade text-xs font-semibold uppercase tracking-[0.18em] text-[#307E57]">
            Feel Secure · Operations value
          </p>
          <h1 className="cs-fade-delay mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-[#183D2B] sm:text-5xl lg:text-[3.4rem]">
            Demi for ENNIA — quieter desks, faster answers, clearer ROI
          </h1>
          <p className="cs-fade-delay-2 mt-5 max-w-2xl text-lg leading-relaxed text-[#6B7280]">
            Two sober ways to run the AI: automate repetitive customer questions, or put the same
            knowledge beside your service agents. Illustrating savings with published industry ranges —
            swap in ENNIA’s volumes to make it yours.
          </p>
        </div>
      </section>

      {/* Integrity — one line */}
      <div className="border-y border-[#CBDED5] bg-white">
        <p className="mx-auto max-w-5xl px-5 py-3.5 text-sm text-[#6B7280] sm:px-8">
          <span className="font-semibold text-[#183D2B]">Illustrative model.</span> Defaults sit inside
          insurance containment (~35–48%) and contact-cost (~$6–$12) benchmarks — not ENNIA internal
          figures.
        </p>
      </div>

      {/* Two models — compact */}
      <section id="model" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
          Choose how you deploy
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <ModelBlock
            kicker="Model A"
            title="Customer chat"
            body="Demi answers FAQs, switches languages (EN/NL/ES/PA), and routes claims vs sales vs support. People take what needs judgment."
            proof="Insurance bots typically contain 35–48% of chat."
          />
          <ModelBlock
            kicker="Model B"
            title="Desk copilot"
            body="Same knowledge layer next to agents — drafts, policy lookup, summaries. Extends capacity; does not replace accountability."
            proof="Peer assist cases: ~15% AHT cut (specialty insurer); up to ~26% in stronger rollouts."
          />
        </div>
      </section>

      {/* Calculator + viz */}
      <section id="calc" className="border-y border-[#CBDED5] bg-white/70 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
                Operating cost model
              </h2>
              <p className="mt-2 text-[#6B7280]">Adjust inputs. Results update live.</p>
            </div>
            <ModeTabs mode={mode} onChange={setMode} />
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            {/* Controls */}
            <div className="space-y-7">
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
                    label="AI containment rate"
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
                    label="Handle-time reduction with assist"
                    value={ahtCut}
                    min={0.1}
                    max={0.26}
                    step={0.01}
                    display={pct(ahtCut)}
                    onChange={setAhtCut}
                  />
                  <Range
                    label="Agents using assist"
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

            {/* Results viz */}
            <div>
              <div
                className="rounded border border-[#CBDED5] p-6 sm:p-8"
                style={{
                  background: `linear-gradient(145deg, #fff 0%, ${C.greenBg} 100%)`,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#307E57]">
                  Estimated annual savings
                </p>
                <CountUp className="mt-2 text-5xl font-bold tracking-tight text-[#183D2B] sm:text-6xl">
                  {model.activeSave}
                </CountUp>
                <p className="mt-2 text-sm text-[#6B7280]">
                  vs baseline {money(model.baseline)} ·{' '}
                  {pct(model.activeSave / Math.max(model.baseline, 1))} of current spend
                </p>

                <div className="mt-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Annual cost
                  </p>
                  <CompareBars
                    baseline={model.baseline}
                    selected={model.activeCost}
                    selectedLabel={
                      mode === 'A' ? 'With chat automation' : mode === 'B' ? 'With desk assist' : 'Combined'
                    }
                  />
                </div>

                {(mode === 'A' || mode === 'AB') && (
                  <div className="mt-8 flex items-center gap-6">
                    <Donut
                      parts={[
                        { value: model.contained, color: C.greenDark, label: 'Contained' },
                        { value: model.partial, color: C.greenAccent, label: 'Partial' },
                        { value: model.humanOnly, color: C.greenDarker, label: 'Human' },
                      ]}
                    />
                    <div className="space-y-2 text-sm">
                      <LegendDot color={C.greenDark} label="AI resolved" n={model.contained} />
                      <LegendDot color={C.greenAccent} label="Hybrid triage" n={model.partial} />
                      <LegendDot color={C.greenDarker} label="Full human" n={model.humanOnly} />
                    </div>
                  </div>
                )}

                {mode === 'B' && (
                  <p className="mt-8 text-sm text-[#6B7280]">
                    About{' '}
                    <strong className="text-[#183D2B]">
                      {Math.round(model.hoursFreed).toLocaleString()} agent-hours
                    </strong>{' '}
                    freed per year (using an 8‑minute average handle-time assumption).
                  </p>
                )}
              </div>

              {mode === 'AB' && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MiniStat label="Chat alone" value={money(model.saveA)} />
                  <MiniStat label="Assist alone" value={money(model.saveB)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Revenue — light, one row */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
          Revenue upside — test, don’t invent
        </h2>
        <p className="mt-3 max-w-2xl text-[#6B7280]">
          Cost savings are the reliable day-one case. Growth needs a 90‑day measurement on ENNIA’s
          funnels. Peer outcomes for context:
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Fact
            num="~11%"
            label="After-hours quote conversion lift"
            detail="AA Ireland, when the bot covered closed hours"
          />
          <Fact
            num="~13%"
            label="Digital conversion lift"
            detail="ACKO GenAI chat vs callback journeys"
          />
          <Fact
            num="PA-ready"
            label="Local-language trust"
            detail="Demi’s Papiamentu layer is built for Curaçao orthography"
          />
        </div>
      </section>

      {/* Product strip */}
      <section
        className="border-y border-[#CBDED5] py-14"
        style={{ background: `linear-gradient(90deg, ${C.greenBg}, #fff 40%, ${C.greenBg})` }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-xl font-bold text-[#183D2B]">See Demi live</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Multilingual RAG chat · routing · lead capture · ENNIA branding
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="rounded bg-[#307E57] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183D2B]"
            >
              Open chat
            </Link>
            <Link
              href="/demo/ennia/login"
              className="rounded border border-[#307E57]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#307E57] hover:bg-[#EEF6E5]"
            >
              Demo login
            </Link>
          </div>
        </div>
      </section>

      {/* Sources — compact */}
      <footer className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#307E57]">Sources</h2>
        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-[#6B7280]">
          <li>
            Insurance containment 35–48% — Forrester CX benchmarks (via industry containment
            syntheses).
          </li>
          <li>
            Human contact ~$6–$12 · AI ~$0.25–$2 · phone ~$8 / chat ~$3.50 — Gartner / IBM / NICE-range
            figures commonly cited in 2025–26 ROI literature.
          </li>
          <li>Assist AHT −15% — Foundever specialty insurer; higher cases (Tower ~26%, AXA wrap-up).</li>
          <li>
            Conversion peers — AA Ireland ~+11% after-hours (ServisBOT); ACKO ~+13% / −50% inbound calls
            (Amplitude).
          </li>
        </ul>
        <div className="mt-10 flex items-center justify-between border-t border-[#CBDED5] pt-6">
          <img
            src={enniaTheme.logo.green}
            alt="ENNIA"
            className="h-6 w-auto opacity-80"
            width={90}
            height={20}
          />
          <p className="text-xs text-[#6B7280]">Astute · Feel Secure</p>
        </div>
      </footer>
    </div>
  )
}

function ModelBlock({
  kicker,
  title,
  body,
  proof,
}: {
  kicker: string
  title: string
  body: string
  proof: string
}) {
  return (
    <div className="border-l-2 border-[#307E57] pl-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#307E57]">{kicker}</p>
      <h3 className="mt-1 text-xl font-bold text-[#183D2B]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{body}</p>
      <p className="mt-4 text-sm font-medium text-[#183D2B]">{proof}</p>
    </div>
  )
}

function ModeTabs({ mode, onChange }: { mode: 'A' | 'B' | 'AB'; onChange: (m: 'A' | 'B' | 'AB') => void }) {
  const items: { id: 'A' | 'B' | 'AB'; label: string }[] = [
    { id: 'A', label: 'Chat' },
    { id: 'B', label: 'Assist' },
    { id: 'AB', label: 'Both' },
  ]
  return (
    <div className="inline-flex rounded border border-[#CBDED5] bg-white p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded px-4 py-1.5 text-sm font-semibold transition ${
            mode === item.id ? 'bg-[#307E57] text-white' : 'text-[#6B7280] hover:text-[#183D2B]'
          }`}
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
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-[#183D2B]">
          {label}
        </label>
        <span className="text-sm font-bold text-[#307E57]">{display}</span>
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
      <div className="h-2.5 overflow-hidden rounded-full bg-[#CBDED5]/50">
        <div
          className="h-full origin-left rounded-full"
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

function Donut({
  parts,
}: {
  parts: { value: number; color: string; label: string }[]
}) {
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
        boxShadow: 'inset 0 0 0 22px #fff',
      }}
      role="img"
      aria-label={parts.map((p) => p.label).join(', ')}
    />
  )
}

function LegendDot({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2 text-[#6B7280]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>
        {label}{' '}
        <strong className="font-semibold text-[#183D2B]">{Math.round(n).toLocaleString()}</strong>
      </span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#CBDED5] bg-white px-4 py-3">
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
