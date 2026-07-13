'use client'

import { useMemo, useState, useId, useEffect, useRef } from 'react'
import { Sora, Source_Sans_3 } from 'next/font/google'
import Link from 'next/link'
import { enniaTheme } from '@/lib/demo-themes/ennia'

/** Sharp geometric display — avoids Signika’s rounded terminals on titles */
const sora = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

const C = enniaTheme.colors
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
    <div className={`${sourceSans.className} relative min-h-screen overflow-x-hidden`} style={{ color: C.text }}>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 8% -8%, ${C.greenAccent}55, transparent 52%),
            radial-gradient(ellipse 70% 45% at 100% 18%, ${C.greenLight}bb, transparent 48%),
            radial-gradient(ellipse 55% 35% at 50% 105%, ${C.greenBg}, transparent 50%),
            linear-gradient(165deg, #ffffff 0%, ${C.greenBg} 50%, #f7fbf2 100%)
          `,
        }}
      />

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
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
          animation: fadeUp 0.6s ease-out both;
        }
        .cs-fade-d1 {
          animation: fadeUp 0.6s ease-out 0.08s both;
        }
        .cs-fade-d2 {
          animation: fadeUp 0.6s ease-out 0.16s both;
        }
        .display {
          font-family: ${sora.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
          letter-spacing: -0.03em;
        }
        .glass {
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 16px 36px -22px rgba(24, 61, 43, 0.26),
            0 2px 6px rgba(48, 126, 87, 0.05);
          backdrop-filter: blur(18px) saturate(1.3);
          -webkit-backdrop-filter: blur(18px) saturate(1.3);
          border-radius: ${R};
        }
        .glass-strong {
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(203, 222, 213, 0.7);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 20px 44px -26px rgba(24, 61, 43, 0.3);
          backdrop-filter: blur(22px) saturate(1.35);
          -webkit-backdrop-filter: blur(22px) saturate(1.35);
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
          padding: 0.65rem 1.2rem;
          border: 1px solid rgba(24, 61, 43, 0.12);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.2) inset,
            0 8px 16px -10px rgba(24, 61, 43, 0.5);
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .btn-ennia:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        .btn-ennia-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${Rsm};
          background: rgba(255, 255, 255, 0.6);
          color: ${C.greenDark};
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.65rem 1.2rem;
          border: 1px solid rgba(48, 126, 87, 0.28);
          backdrop-filter: blur(10px);
          transition: background 0.15s ease;
        }
        .btn-ennia-ghost:hover {
          background: rgba(238, 246, 229, 0.95);
        }
        .field-glass {
          border-radius: ${Rsm};
          background: rgba(255, 255, 255, 0.52);
          border: 1px solid rgba(203, 222, 213, 0.8);
          padding: 0.75rem 0.9rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field-glass:focus-within {
          border-color: rgba(48, 126, 87, 0.5);
          box-shadow: 0 0 0 3px rgba(48, 126, 87, 0.12);
          background: rgba(255, 255, 255, 0.82);
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
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(180deg, #4a9d78, ${C.greenDark});
          border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(24, 61, 43, 0.25);
          cursor: pointer;
        }
      `}</style>

      {/* Full-bleed sticky bar — wider than content rail */}
      <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5 lg:px-8">
        <div className="glass mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={enniaTheme.logo.green}
              alt="ENNIA"
              width={enniaTheme.logo.greenWidth}
              height={enniaTheme.logo.greenHeight}
              className="h-7 w-auto shrink-0"
            />
            <span className="hidden h-4 w-px bg-[#CBDED5] sm:block" />
            <span className="truncate text-sm text-[#6B7280]">Service operations case study</span>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            <a href="#model" className="btn-ennia-ghost hidden px-3 py-1.5 md:inline-flex">
              Models
            </a>
            <a href="#calc" className="btn-ennia-ghost hidden px-3 py-1.5 sm:inline-flex">
              Calculator
            </a>
            <Link href="/chat" className="btn-ennia px-3.5 py-1.5">
              Try Demi
            </Link>
          </nav>
        </div>
      </header>

      {/* Content rail */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero — same width as rest of page */}
        <section className="pt-8 sm:pt-10">
          <div className="glass-strong cs-fade p-6 sm:p-9 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#307E57]">
              Feel Secure · Operations value
            </p>
            <h1
              className={`${sora.className} display cs-fade-d1 mt-3 max-w-4xl text-[1.85rem] font-semibold leading-[1.12] text-[#183D2B] sm:text-4xl lg:text-[2.75rem]`}
            >
              Demi for ENNIA — quieter desks, faster answers, clearer ROI
            </h1>
            <p className="cs-fade-d2 mt-4 max-w-3xl text-base leading-relaxed text-[#6B7280] sm:text-lg">
              Two sober deployments: automate repetitive customer questions, or put the same knowledge
              beside service agents. Savings use published industry ranges — replace the inputs with
              ENNIA’s volumes to make the model yours.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a href="#calc" className="btn-ennia">
                Open calculator
              </a>
              <a href="#model" className="btn-ennia-ghost">
                View models
              </a>
              <Link href="/demo/ennia/login" className="btn-ennia-ghost">
                Demo login
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#6B7280]">
            <span className="font-semibold text-[#183D2B]">Illustrative model.</span> Defaults sit in
            insurance containment (~35–48%) and contact-cost (~$6–$12) benchmarks — not ENNIA internal
            figures.
          </p>
        </section>

        {/* What Demi does */}
        <section className="pt-10 sm:pt-12">
          <h2 className={`${sora.className} display text-xl font-semibold text-[#183D2B] sm:text-2xl`}>
            What this application already does
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [
                'Answers from your knowledge',
                'RAG over ENNIA documents — grounded in approved content, not generic inventiveness.',
              ],
              [
                'Papiamentu as first-class',
                'EN / NL / ES / PA with a Curaçao orthography correction layer (Buki di Oro + school lexicon).',
              ],
              [
                'Routing & escalation',
                'Claims, sales, billing, support — hand off to people or department links when AI should stop.',
              ],
              [
                'Lead capture & continuity',
                'Intent signals, conversation context, and 24/7 front-door coverage when agents are offline.',
              ],
            ].map(([t, b]) => (
              <div key={t} className="glass p-4 sm:p-5">
                <h3 className={`${sora.className} text-sm font-semibold text-[#183D2B]`}>{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Models */}
        <section id="model" className="pt-10 sm:pt-12">
          <h2 className={`${sora.className} display text-xl font-semibold text-[#183D2B] sm:text-2xl`}>
            Two deployment models
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#6B7280]">
            Most failed AI projects collapse these into “replace the contact center.” The durable
            path for an insurer is usually both — sequenced carefully.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ModelPick
              active={mode === 'A' || mode === 'AB'}
              kicker="Model A"
              title="Customer chat"
              body="Demi answers FAQs, switches languages, and routes claims vs sales vs support. People keep judgment and empathy cases."
              proof="Insurance bots typically contain 35–48% of chat (Forrester CX syntheses)."
              onSelect={() => {
                setMode('A')
                document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
            <ModelPick
              active={mode === 'B' || mode === 'AB'}
              kicker="Model B"
              title="Desk copilot"
              body="Same knowledge beside agents — drafts, policy lookup, summaries. Extends capacity; does not replace accountability."
              proof="Peer assist: ~15% AHT cut (Foundever specialty insurer); stronger cases cite up to ~26%."
              onSelect={() => {
                setMode('B')
                document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          </div>
        </section>

        {/* Calculator */}
        <section id="calc" className="pt-10 sm:pt-12">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={`${sora.className} display text-xl font-semibold text-[#183D2B] sm:text-2xl`}>
                Operating cost model
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">Adjust inputs. Results update live.</p>
            </div>
            <ModeTabs mode={mode} onChange={setMode} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="glass-strong p-4 sm:p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#307E57]">
                Specification
              </p>
              <div className="space-y-2.5">
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

            <div className="glass-strong relative overflow-hidden p-4 sm:p-6">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-35"
                style={{ background: `radial-gradient(circle, ${C.greenAccent}, transparent 70%)` }}
              />
              <p className="relative text-xs font-semibold uppercase tracking-[0.12em] text-[#307E57]">
                Estimated annual savings
              </p>
              <CountUp
                className={`${sora.className} display relative mt-1.5 text-4xl font-semibold tracking-tight text-[#183D2B] sm:text-5xl`}
              >
                {model.activeSave}
              </CountUp>
              <p className="relative mt-1.5 text-sm text-[#6B7280]">
                vs baseline {money(model.baseline)} ·{' '}
                {pct(model.activeSave / Math.max(model.baseline, 1))} of spend
              </p>

              <div className="relative mt-6">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Annual cost
                </p>
                <CompareBars
                  baseline={model.baseline}
                  selected={model.activeCost}
                  selectedLabel={
                    mode === 'A' ? 'With chat' : mode === 'B' ? 'With assist' : 'Combined'
                  }
                />
              </div>

              {(mode === 'A' || mode === 'AB') && (
                <div className="relative mt-6 flex items-center gap-4 border-t border-[#CBDED5]/70 pt-5">
                  <Donut
                    parts={[
                      { value: model.contained, color: C.greenDark, label: 'Contained' },
                      { value: model.partial, color: C.greenAccent, label: 'Partial' },
                      { value: model.humanOnly, color: C.greenDarker, label: 'Human' },
                    ]}
                  />
                  <div className="space-y-1.5 text-sm">
                    <LegendDot color={C.greenDark} label="AI resolved" n={model.contained} />
                    <LegendDot color={C.greenAccent} label="Hybrid" n={model.partial} />
                    <LegendDot color={C.greenDarker} label="Human" n={model.humanOnly} />
                  </div>
                </div>
              )}

              {mode === 'B' && (
                <p className="relative mt-5 border-t border-[#CBDED5]/70 pt-4 text-sm text-[#6B7280]">
                  ≈{' '}
                  <strong className="text-[#183D2B]">
                    {Math.round(model.hoursFreed).toLocaleString()} agent-hours
                  </strong>{' '}
                  / year (8‑min AHT assumption)
                </p>
              )}

              {mode === 'AB' && (
                <div className="relative mt-4 grid grid-cols-2 gap-2.5">
                  <MiniStat label="Chat alone" value={money(model.saveA)} />
                  <MiniStat label="Assist alone" value={money(model.saveB)} />
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#6B7280]">
            <strong className="text-[#183D2B]">Formula.</strong> Baseline = contacts × human cost.
            Model A: contained × AI cost + partial (~$3 residual) + remainder at human cost. Model B:
            AHT% on the adopted share only. Combined applies containment first, then assist on leftover
            human work (no double-count).
          </p>
        </section>

        {/* Revenue */}
        <section className="pt-10 sm:pt-12">
          <div className="glass p-5 sm:p-7">
            <h2 className={`${sora.className} display text-xl font-semibold text-[#183D2B]`}>
              Revenue upside — test, don’t invent
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">
              Cost savings are the reliable day-one case. Growth needs a 90‑day measurement on ENNIA’s
              funnels. Peer outcomes for context only:
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <Fact num="~11%" label="After-hours quote conversion" detail="AA Ireland quote bot" />
              <Fact num="~13%" label="Digital conversion lift" detail="ACKO GenAI vs callback" />
              <Fact num="PA-ready" label="Local-language trust" detail="Curaçao Papiamentu orthography" />
            </div>
            <p className="mt-5 text-xs text-[#6B7280]">
              Practical ENNIA test: instrument quote / lead / handoff events for 90 days; attribute only
              closed-won with chat touchpoints. Lead with ops savings until then.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-6 sm:pt-8">
          <div className="glass-strong flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className={`${sora.className} text-lg font-semibold text-[#183D2B]`}>See Demi live</h2>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                Multilingual RAG · routing · lead capture · ENNIA branding
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/chat" className="btn-ennia">
                Open chat
              </Link>
              <Link href="/demo/ennia/login" className="btn-ennia-ghost">
                Demo login
              </Link>
            </div>
          </div>
        </section>

        {/* Sources */}
        <footer className="pb-12 pt-8">
          <div className="glass px-5 py-5 text-xs leading-relaxed text-[#6B7280]">
            <p className={`${sora.className} text-sm font-semibold text-[#307E57]`}>Sources</p>
            <ul className="mt-2 space-y-1">
              <li>
                Insurance containment 35–48% — Forrester CX benchmarks (industry containment
                syntheses).
              </li>
              <li>
                Human contact ~$6–$12 · AI ~$0.25–$2 · phone ~$8 / chat ~$3.50 — Gartner / IBM /
                NICE-range figures.
              </li>
              <li>Assist AHT −15% — Foundever specialty insurer; Tower ~26%; AXA wrap-up ~60s.</li>
              <li>
                Conversion peers — AA Ireland ~+11% after-hours (ServisBOT); ACKO ~+13% / −50% inbound
                (Amplitude). Inspired by ENNIA’s clear online flows like{' '}
                <a
                  href="https://web.ennia.com/PROD_APP/ennia/r/reis/start?p_lang=en-us"
                  className="underline decoration-[#307E57]/40 underline-offset-2 hover:text-[#307E57]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  travel premium specification
                </a>
                .
              </li>
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[#CBDED5]/60 pt-4">
              <img src={enniaTheme.logo.green} alt="ENNIA" className="h-5 w-auto opacity-80" />
              <span>Astute · Feel Secure</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ModelPick({
  active,
  kicker,
  title,
  body,
  proof,
  onSelect,
}: {
  active: boolean
  kicker: string
  title: string
  body: string
  proof: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`glass p-5 text-left transition ${
        active ? 'ring-2 ring-[#307E57]/30' : 'hover:bg-white/75'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-[#307E57]">{kicker}</span>
      <h3 className={`${sora.className} mt-1 text-lg font-semibold text-[#183D2B]`}>{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{body}</p>
      <p className="mt-3 text-sm font-semibold text-[#183D2B]">{proof}</p>
    </button>
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
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(203,222,213,0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className="px-3.5 py-1.5 text-sm font-semibold transition"
          style={{
            borderRadius: '6px',
            background: mode === item.id ? C.greenDark : 'transparent',
            color: mode === item.id ? '#fff' : C.textMuted,
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
      <div className="mb-2 flex items-baseline justify-between gap-3">
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
    <div className="space-y-3">
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
      <div className="mb-1 flex justify-between text-xs text-[#6B7280]">
        <span>{label}</span>
        <span className="font-semibold text-[#183D2B]">{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[#CBDED5]/45">
        <div
          className="h-full origin-left rounded"
          style={{
            width: `${Math.max(6, (value / max) * 100)}%`,
            backgroundColor: color,
            animation: 'drawBar 0.75s ease-out both',
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
      className="h-24 w-24 shrink-0 rounded-full sm:h-28 sm:w-28"
      style={{
        background: `conic-gradient(${stops})`,
        boxShadow: 'inset 0 0 0 18px rgba(255,255,255,0.92)',
      }}
      role="img"
      aria-label={parts.map((p) => p.label).join(', ')}
    />
  )
}

function LegendDot({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2 text-[#6B7280]">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      <span>
        {label}{' '}
        <strong className="font-semibold text-[#183D2B]">{Math.round(n).toLocaleString()}</strong>
      </span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-glass !py-2.5">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className={`${sora.className} mt-0.5 text-base font-semibold text-[#307E57]`}>{value}</p>
    </div>
  )
}

function Fact({ num, label, detail }: { num: string; label: string; detail: string }) {
  return (
    <div>
      <p className={`${sora.className} text-2xl font-semibold tracking-tight text-[#307E57]`}>{num}</p>
      <p className="mt-1.5 font-semibold text-[#183D2B]">{label}</p>
      <p className="mt-0.5 text-sm text-[#6B7280]">{detail}</p>
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
    const dur = 600
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
