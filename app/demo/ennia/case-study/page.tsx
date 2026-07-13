'use client'

import { useMemo, useState, useId } from 'react'
import { Signika } from 'next/font/google'
import Link from 'next/link'
import { enniaTheme } from '@/lib/demo-themes/ennia'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

/** Published industry ranges — cited in Sources. Used as calculator defaults only. */
const BENCHMARKS = {
  humanBlendedCostLow: 6,
  humanBlendedCostHigh: 12,
  humanLiveChat: 3.5,
  humanPhone: 8.01,
  insuranceContainmentLow: 0.35,
  insuranceContainmentHigh: 0.48,
  botCostLow: 0.25,
  botCostHigh: 2.0,
  partialContainSaveLow: 2,
  partialContainSaveHigh: 4,
  ahtReduceSpecialtyInsurer: 0.15,
  ahtReduceTower: 0.26,
  afterHoursConversionLift: 0.11,
  ackoConversionLift: 0.13,
  ackoInboundCallDrop: 0.5,
} as const

function currency(n: number, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(n)
}

function currencyExact(n: number) {
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
  const [monthlyContacts, setMonthlyContacts] = useState(4000)
  const [costPerContact, setCostPerContact] = useState(8)
  const [containment, setContainment] = useState(0.38)
  const [botCost, setBotCost] = useState(1.0)
  const [partialRate, setPartialRate] = useState(0.25)
  const [ahtReduction, setAhtReduction] = useState(0.15)
  const [assistAdoption, setAssistAdoption] = useState(0.7)
  const [currencyLabel, setCurrencyLabel] = useState<'USD' | 'ANG' | 'EUR'>('USD')

  const model = useMemo(() => {
    const annualContacts = monthlyContacts * 12
    const baselineAnnual = annualContacts * costPerContact

    // Model A — automated chat for routine FAQs + routing
    const fullyContained = annualContacts * containment
    const partiallyHandled = annualContacts * (1 - containment) * partialRate
    const stillFullyHuman =
      annualContacts - fullyContained - partiallyHandled

    const costContained = fullyContained * botCost
    const costPartial =
      partiallyHandled *
      ((BENCHMARKS.partialContainSaveLow + BENCHMARKS.partialContainSaveHigh) / 2)
    const costHuman = stillFullyHuman * costPerContact
    const modelAAnnual = costContained + costPartial + costHuman
    const modelASavings = Math.max(0, baselineAnnual - modelAAnnual)

    // Model B — agent assist (augmentation, not replacement)
    // Agents still handle nearly all contacts; AHT drops on adopted share.
    const assistedShare = annualContacts * assistAdoption
    const unassistedShare = annualContacts * (1 - assistAdoption)
    const assistedCost = assistedShare * costPerContact * (1 - ahtReduction)
    const unassistedCost = unassistedShare * costPerContact
    const modelBAnnual = assistedCost + unassistedCost
    const modelBSavings = Math.max(0, baselineAnnual - modelBAnnual)

    // Combined (realistic rollout: chat containment on FAQs + assist on human queue)
    // Avoid double-counting: apply containment first, then AHT reduction on remaining human work.
    const combinedContained = fullyContained
    const remainingAfterContain = annualContacts - combinedContained
    const remainingPartial = remainingAfterContain * partialRate
    const remainingHuman = remainingAfterContain - remainingPartial
    const combinedCost =
      combinedContained * botCost +
      remainingPartial *
        ((BENCHMARKS.partialContainSaveLow + BENCHMARKS.partialContainSaveHigh) / 2) +
      remainingHuman * assistAdoption * costPerContact * (1 - ahtReduction) +
      remainingHuman * (1 - assistAdoption) * costPerContact
    const combinedSavings = Math.max(0, baselineAnnual - combinedCost)

    // Capacity: hours freed (assume 8 min AHT baseline for calculator illustration)
    const baselineMinutes = 8
    const minutesFreedAssist =
      (assistedShare * baselineMinutes * ahtReduction) / 60

    return {
      annualContacts,
      baselineAnnual,
      fullyContained,
      partiallyHandled,
      stillFullyHuman,
      modelAAnnual,
      modelASavings,
      modelBAnnual,
      modelBSavings,
      combinedCost,
      combinedSavings,
      minutesFreedAssist,
      modelARoiVsBaseline: baselineAnnual > 0 ? modelASavings / baselineAnnual : 0,
      modelBRoiVsBaseline: baselineAnnual > 0 ? modelBSavings / baselineAnnual : 0,
      combinedRoi: baselineAnnual > 0 ? combinedSavings / baselineAnnual : 0,
    }
  }, [
    monthlyContacts,
    costPerContact,
    containment,
    botCost,
    partialRate,
    ahtReduction,
    assistAdoption,
  ])

  const chartMax = Math.max(model.baselineAnnual, model.modelAAnnual, model.modelBAnnual, model.combinedCost, 1)

  return (
    <div className={`${signika.className} ennia-case min-h-screen text-[#3D3C4A]`}>
      <style jsx global>{`
        .ennia-case {
          --green: ${enniaTheme.colors.greenDark};
          --green-darker: ${enniaTheme.colors.greenDarker};
          --green-bg: ${enniaTheme.colors.greenBg};
          --green-accent: ${enniaTheme.colors.greenAccent};
          --green-light: ${enniaTheme.colors.greenLight};
          --green-border: ${enniaTheme.colors.greenBorder};
          --ink: ${enniaTheme.colors.text};
          --muted: ${enniaTheme.colors.textMuted};
        }
        .ennia-case input[type='range'] {
          accent-color: var(--green);
        }
      `}</style>

      {/* Hero */}
      <header
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(165deg, ${enniaTheme.colors.greenDarker} 0%, ${enniaTheme.colors.greenDark} 55%, #3a9a6a 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(185,217,148,0.35), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(204,234,216,0.2), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10">
          <div className="mb-12 flex items-center justify-between gap-4">
            <img
              src={enniaTheme.logo.white}
              alt="ENNIA"
              width={enniaTheme.logo.whiteWidth}
              height={enniaTheme.logo.whiteHeight}
              className="h-8 w-auto sm:h-9"
            />
            <p className="text-sm font-semibold tracking-wide text-white/80">Feel Secure</p>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B9D994]">
            Service operations case study
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.35rem]">
            What disciplined AI support can return for ENNIA
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            A transparent operating model for <strong className="font-semibold text-white">Demi</strong> —
            Astute’s multilingual AI assistant — across two realistic deployments: customer-facing
            automation for repetitive questions, and an internal tool that sharpens service-desk agents
            rather than replacing them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a
              href="#models"
              className="rounded bg-white px-4 py-2.5 font-semibold text-[#307E57] transition hover:bg-[#EEF6E5]"
            >
              Compare the two models
            </a>
            <a
              href="#calculator"
              className="rounded border border-white/35 px-4 py-2.5 font-semibold text-white transition hover:bg-white/10"
            >
              Open the ROI calculator
            </a>
          </div>
        </div>
      </header>

      {/* Integrity banner */}
      <div className="border-b border-[#CBDED5] bg-[#EEF6E5]">
        <div className="mx-auto max-w-6xl px-5 py-4 text-sm leading-relaxed text-[#3D3C4A] sm:px-8">
          <strong className="font-semibold text-[#183D2B]">How to read this page.</strong> Figures below
          are <em>illustrative scenarios</em> built from published industry benchmarks (insurance
          containment, contact cost, agent-assist AHT). They are{' '}
          <strong>not ENNIA’s internal volumes or finances</strong>. Replace the calculator inputs with
          ENNIA’s actual monthly contacts and cost-to-serve to get an ENNIA-specific business case.
        </div>
      </div>

      <main>
        {/* Product truth */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
            What this application already does
          </h2>
          <p className="mt-3 max-w-3xl text-[#6B7280]">
            Capabilities live in the Astute / Demi stack today — facts about the product, not projections.
          </p>
          <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {[
              [
                'Answers from your knowledge',
                'RAG over ENNIA documents — answers grounded in approved content, not generic internet inventiveness.',
              ],
              [
                'Papiamentu as a first-class language',
                'EN / NL / ES / PA with a dedicated Papiamentu correction layer (Buki di Oro orthography + school-book lexicon).',
              ],
              [
                'Routing & escalation',
                'Routes claims, sales, billing, and support intents; hands off to humans or department links when the AI should stop.',
              ],
              [
                'Lead capture & continuity',
                'Captures intent signals, retains conversation context, and supports 24/7 front-door coverage when agents are offline.',
              ],
            ].map(([title, body]) => (
              <li key={title} className="border-l-2 border-[#307E57] pl-4">
                <h3 className="font-semibold text-[#183D2B]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Two models */}
        <section id="models" className="bg-[#EEF6E5]/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
              Two deployment models — not one hype story
            </h2>
            <p className="mt-3 max-w-3xl text-[#6B7280]">
              Most failed AI projects collapse these into “replace the contact center.” The sober path
              for an insurer is usually both — sequenced carefully.
            </p>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <article className="rounded border border-[#CBDED5] bg-white p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#307E57]">
                  Model A — Customer chat
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#183D2B]">
                  Automate repetitive questions & route the rest
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                  Demi answers high-volume FAQs (policy basics, opening hours, document lists, claim
                  status entry points, language switching). Complex claims, disputes, and empathy cases
                  escalate to people — with context.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#3D3C4A]">
                  <li>
                    • Industry insurance chatbot containment typically{' '}
                    <strong>35–48%</strong> (Forrester CX benchmarks cited in trade syntheses, 2025).
                  </li>
                  <li>
                    • Human contacts often land around <strong>$6–$12</strong> blended (Gartner /
                    NICE-range contact costs); automated resolutions commonly{' '}
                    <strong>$0.25–$2</strong>.
                  </li>
                  <li>
                    • Peer precedent: ACKO reported ~<strong>50% inbound call drop</strong> after GenAI
                    chat on high-volume journeys (Amplitude case study) — useful directionally, not a
                    promise.
                  </li>
                </ul>
              </article>

              <article className="rounded border border-[#CBDED5] bg-white p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#307E57]">
                  Model B — Service desk tool
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#183D2B]">
                  Copilot for agents — extend the arm, don’t cut it off
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                  Same knowledge layer and Papiamentu strength, used{' '}
                  <em>beside</em> agents: draft answers, pull policy wording, summarize threads, suggest
                  next actions. Humans stay accountable; AI shrinks search-and-type drag.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#3D3C4A]">
                  <li>
                    • Specialty insurer AI-augmented agents:{' '}
                    <strong>15% AHT reduction in 30 days</strong> (Foundever / claims operation case).
                  </li>
                  <li>
                    • Tower Insurance agent-assist reported up to <strong>~26% call-time reduction</strong>{' '}
                    in published case write-ups — treat as upside ceiling, not baseline.
                  </li>
                  <li>
                    • AXA Health: wrap-up automation cut ~<strong>60 seconds AHT</strong> across large
                    call volume (Verint) — shows admin load is real.
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section id="calculator" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
                Interactive cost model
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
                Defaults sit inside published ranges. Change inputs to ENNIA’s numbers.
              </p>
            </div>
            <label className="text-sm text-[#6B7280]">
              Display currency label{' '}
              <select
                className="ml-2 rounded border border-[#CBDED5] bg-white px-2 py-1.5 text-[#183D2B]"
                value={currencyLabel}
                onChange={(e) => setCurrencyLabel(e.target.value as typeof currencyLabel)}
              >
                <option value="USD">USD</option>
                <option value="ANG">ANG (label only)</option>
                <option value="EUR">EUR (label only)</option>
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">
            Currency formatting uses USD math for benchmark fidelity; switch the label if you brief in
            ANG/EUR — recalculate with local cost-to-serve.
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6 rounded border border-[#CBDED5] bg-[#EEF6E5]/40 p-5 sm:p-6">
              <Slider
                label="Monthly contacts (all channels + chat proxy)"
                value={monthlyContacts}
                min={500}
                max={25000}
                step={100}
                onChange={setMonthlyContacts}
                display={monthlyContacts.toLocaleString()}
                hint="Scenario start: 4,000/mo ≈ mid-size regional book. Replace with ENNIA CRM/ticketing totals."
              />
              <Slider
                label="Fully loaded cost per human contact"
                value={costPerContact}
                min={3}
                max={15}
                step={0.25}
                onChange={setCostPerContact}
                display={currencyExact(costPerContact)}
                hint={`Industry blend often $6–$12 (Gartner-range); phone ~$${BENCHMARKS.humanPhone}, live chat ~$${BENCHMARKS.humanLiveChat} (NICE CXone industry report figures commonly cited).`}
              />
              <Slider
                label="Model A — fully contained / resolved by AI"
                value={containment}
                min={0.2}
                max={0.55}
                step={0.01}
                onChange={setContainment}
                display={pct(containment)}
                hint={`Insurance chatbots often land 35–48% containment (Forrester CX syntheses). Default ${(BENCHMARKS.insuranceContainmentLow * 100).toFixed(0)}–${(BENCHMARKS.insuranceContainmentHigh * 100).toFixed(0)}% band.`}
              />
              <Slider
                label="Cost per AI-contained interaction"
                value={botCost}
                min={0.25}
                max={2.5}
                step={0.05}
                onChange={setBotCost}
                display={currencyExact(botCost)}
                hint="Published ranges ~$0.25–$2.00 depending on stack & whether billed per resolution."
              />
              <Slider
                label="Of remaining contacts — partial bot triage then human"
                value={partialRate}
                min={0}
                max={0.5}
                step={0.05}
                onChange={setPartialRate}
                display={pct(partialRate)}
                hint="Partial contain often still saves vs full human handle (~$2–$4 residual in Forrester TEI-style figures)."
              />
              <Slider
                label="Model B — AHT / handle-time reduction with assist"
                value={ahtReduction}
                min={0.08}
                max={0.26}
                step={0.01}
                onChange={setAhtReduction}
                display={pct(ahtReduction)}
                hint="Conservative default 15% (Foundever specialty insurer). Upside cases cite ~26% (Tower)."
              />
              <Slider
                label="Model B — share of human contacts where assist is used"
                value={assistAdoption}
                min={0.3}
                max={1}
                step={0.05}
                onChange={setAssistAdoption}
                display={pct(assistAdoption)}
                hint="Tower-style programs saw ~60% employee adoption early; model allows higher once trained."
              />
            </div>

            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat
                  label={`Baseline annual cost (${currencyLabel})`}
                  value={currency(model.baselineAnnual)}
                  note={`${model.annualContacts.toLocaleString()} contacts × ${currencyExact(costPerContact)}`}
                />
                <Stat
                  label={`Combined model savings / yr (${currencyLabel})`}
                  value={currency(model.combinedSavings)}
                  note={`${pct(model.combinedRoi)} vs baseline — A then B on remainder`}
                  accent
                />
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#307E57]">
                  Annual cost comparison
                </h3>
                <CostBars
                  max={chartMax}
                  bars={[
                    { label: 'Baseline (all human)', value: model.baselineAnnual, color: '#183D2B' },
                    { label: 'Model A — chat automation', value: model.modelAAnnual, color: '#307E57' },
                    { label: 'Model B — agent assist only', value: model.modelBAnnual, color: '#6B9B7A' },
                    { label: 'Combined A + B', value: model.combinedCost, color: '#B9D994' },
                  ]}
                />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Stat
                  label="Model A savings / yr"
                  value={currency(model.modelASavings)}
                  note={`${Math.round(model.fullyContained).toLocaleString()} fully contained · ${pct(model.modelARoiVsBaseline)} of baseline`}
                />
                <Stat
                  label="Model B savings / yr"
                  value={currency(model.modelBSavings)}
                  note={`≈ ${Math.round(model.minutesFreedAssist).toLocaleString()} agent-hours freed / yr (8‑min AHT assumption)`}
                />
              </div>

              <VolumeMix
                contained={model.fullyContained}
                partial={model.partiallyHandled}
                human={model.stillFullyHuman}
              />
            </div>
          </div>

          <div className="mt-8 rounded border border-[#CBDED5] bg-white p-5 text-sm leading-relaxed text-[#6B7280]">
            <strong className="text-[#183D2B]">Formula transparency (Model A).</strong>{' '}
            Annual baseline = contacts × human cost. Contained cost = contained volume × AI cost.
            Partial = remaining × partial rate × ~$3 midpoint residual. Remainder stays at full human
            cost. <strong className="text-[#183D2B]">Model B</strong> applies AHT% only to the adopted
            share of contacts — agents still handle the work; each contact simply costs less time.
            <strong className="text-[#183D2B]"> Combined</strong> applies containment first, then assist
            on leftover human work (avoids double-counting the same contact as “deflected” and “assisted”).
          </div>
        </section>

        {/* Revenue-adjacent value */}
        <section className="border-y border-[#CBDED5] bg-[#183D2B] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Can this make money — not only save it?
            </h2>
            <p className="mt-3 max-w-3xl text-white/75">
              Revenue impact is possible but less certain than cost reduction. We do{' '}
              <strong className="text-white">not invent ENNIA premium uplift</strong>. Instead, here are
              peer outcomes you can pressure-test against ENNIA’s quote and after-hours funnels.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <ValuePoint
                title="After-hours conversion"
                body="AA Ireland saw an ~11% lift in quote-to-sale conversion simply by having a bot engage when the contact center was closed (ServisBOT / AA case). For ENNIA: measure quotes started 18:00–08:00 and apply your actual conversion — that becomes the revenue case."
              />
              <ValuePoint
                title="Sales chat completion"
                body="ACKO reported ~13% higher health-insurance conversions and ~50% fewer inbound sales calls after GenAI chat vs callback flows (Amplitude). Treat as a peer ceiling for digital journeys with quote friction — validate with an ENNIA A/B."
              />
              <ValuePoint
                title="Retention & trust"
                body="Faster first response and local-language (Papiamentu) service reduce abandonment and complaint load. Those show up as lower churn and less complaint handling cost — typically measured after 2–3 quarters, not day one."
              />
            </div>
            <p className="mt-8 text-sm text-white/60">
              Practical ENNIA test: instrument Demi with quote / lead / handoff events for 90 days;
              attribute only closed-won policies with chat touchpoints. Until then, lead with ops savings
              (calculator above) — revenue is a second wave.
            </p>
          </div>
        </section>

        {/* Why ENNIA-shaped */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-[#183D2B] sm:text-3xl">
            Why this stack fits ENNIA specifically
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              [
                'Multilingual Caribbean reality',
                'Customers switch EN / NL / ES / PA. Demi’s PA layer is built for Curaçao orthography — rare among off-the-shelf chatbots.',
              ],
              [
                'Insurance-shaped routing',
                'Claims vs sales vs billing vs support are different risk and compliance paths. The routing layer is designed for those doors, not one generic inbox.',
              ],
              [
                'Human oversight by design',
                'Model B is first-class: knowledge search and drafting for agents, with escalation when automation should stop. That matches regulated-industry duty of care.',
              ],
            ].map(([t, b]) => (
              <div key={t}>
                <h3 className="font-semibold text-[#307E57]">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href="/chat"
              className="rounded bg-[#307E57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183D2B]"
            >
              Open live Demi chat
            </Link>
            <Link
              href="/demo/ennia/login"
              className="rounded border border-[#CBDED5] px-5 py-3 text-sm font-semibold text-[#307E57] transition hover:bg-[#EEF6E5]"
            >
              ENNIA demo login
            </Link>
          </div>
        </section>

        {/* Sources */}
        <section id="sources" className="bg-[#EEF6E5]/70 py-14">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-xl font-bold text-[#183D2B]">Sources & assumptions</h2>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#6B7280]">
              <li>
                Insurance chatbot containment ~35–48% — Forrester Customer Experience Index figures as
                summarized in industry containment roundups (e.g. Stealth Agents containment research
                compilation, 2025/26).
              </li>
              <li>
                Human ticket cost ~$6–$12 blended; AI contained ~$0.25–$2; partial ~$2–$4 — Gartner /
                IBM / Forrester TEI ranges commonly cited in 2025 contact-center AI ROI literature;
                NICE CXone industry report figures for phone (~$8.01) and live chat (~$3.50).
              </li>
              <li>
                Agent-assist AHT −15% in 30 days — Foundever case study, U.S. specialty insurer claims
                operation.
              </li>
              <li>
                Higher-end assist outcomes — Tower Insurance customer-support AI case (Context Windows /
                published summary, call-time reduction figures up to ~26%); AXA Health / Verint wrap-up
                bot (~60s AHT).
              </li>
              <li>
                After-hours / digital conversion precedents — AA Ireland quote bot (~+11% conversion when
                contact center closed, ServisBOT); ACKO GenAI chat (~+13% health conversions, ~−50%
                inbound calls, Amplitude case study).
              </li>
              <li>
                Hybrid caution — analysts and practitioners consistently find full automation without
                human escalation harms CSAT; 60–70% AI / 30–40% human hybrids are the durable pattern
                (e.g. Digital Applied / hybrid contact-center commentary, 2026).
              </li>
            </ol>
            <p className="mt-6 text-xs text-[#6B7280]">
              Prepared for ENNIA stakeholder conversation · Astute Web Agency · illustrative model only ·
              revisit inputs with ENNIA operations finance before any investment committee decision.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#CBDED5] py-8 text-center text-sm text-[#6B7280]">
        <img
          src={enniaTheme.logo.green}
          alt="ENNIA"
          className="mx-auto mb-3 h-7 w-auto opacity-90"
          width={enniaTheme.logo.greenWidth}
          height={enniaTheme.logo.greenHeight}
        />
        Feel Secure · Case study for Demi / Astute AIssistant
      </footer>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
  display: string
  hint: string
}) {
  const id = useId()
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-[#183D2B]">
          {label}
        </label>
        <span className="shrink-0 text-sm font-bold text-[#307E57]">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <p className="mt-1 text-xs leading-snug text-[#6B7280]">{hint}</p>
    </div>
  )
}

function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded border p-4 ${
        accent ? 'border-[#307E57] bg-[#EEF6E5]' : 'border-[#CBDED5] bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-[#183D2B]' : 'text-[#307E57]'}`}>{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{note}</p>
    </div>
  )
}

function CostBars({
  max,
  bars,
}: {
  max: number
  bars: { label: string; value: number; color: string }[]
}) {
  return (
    <div className="mt-4 space-y-3">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="mb-1 flex justify-between text-xs text-[#6B7280]">
            <span>{b.label}</span>
            <span className="font-semibold text-[#183D2B]">{currency(b.value)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-[#CBDED5]/60">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${Math.max(4, (b.value / max) * 100)}%`,
                backgroundColor: b.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function VolumeMix({
  contained,
  partial,
  human,
}: {
  contained: number
  partial: number
  human: number
}) {
  const total = contained + partial + human || 1
  const c = (contained / total) * 100
  const p = (partial / total) * 100
  const h = (human / total) * 100
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#307E57]">
        Model A annual volume mix
      </h3>
      <div className="mt-3 flex h-4 overflow-hidden rounded">
        <div style={{ width: `${c}%`, backgroundColor: '#307E57' }} title="Contained" />
        <div style={{ width: `${p}%`, backgroundColor: '#B9D994' }} title="Partial" />
        <div style={{ width: `${h}%`, backgroundColor: '#183D2B' }} title="Human" />
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#6B7280]">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#307E57]" /> Contained{' '}
          {Math.round(contained).toLocaleString()} ({c.toFixed(0)}%)
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#B9D994]" /> Partial{' '}
          {Math.round(partial).toLocaleString()} ({p.toFixed(0)}%)
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#183D2B]" /> Human{' '}
          {Math.round(human).toLocaleString()} ({h.toFixed(0)}%)
        </span>
      </div>
    </div>
  )
}

function ValuePoint({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-[#B9D994]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
    </div>
  )
}
