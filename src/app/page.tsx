import type { Metadata } from "next";
import { TypeformWidget } from "@/components/TypeformWidget";

export const metadata: Metadata = {
  title: "Capital Clarity Session™ | Regenerative Capital Navigator",
  description:
    "A 60–75 minute 1:1 session for NYC founders and small business owners to understand where they stand with funding, what paths exist, and what to do next — without pressure, jargon, or predatory products.",
};

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="w-full border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-sm sm:text-base">
            Regenerative Capital Navigator
            <span className="text-slate-500">™</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-400">
            by Path to Impact
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 lg:py-14 grid gap-10 lg:grid-cols-[1.1fr,0.95fr] items-start">
          {/* Left: copy */}
          <section className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-slate-700/80 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.16em] text-slate-300 bg-slate-900/70">
              Capital Clarity Session™
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
              Clarity for funding your business{" "}
              <span className="text-emerald-300">
                without pressure or predatory noise.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A 60–75 minute 1:1 session for NYC founders, freelancers, and small
              business owners navigating grants, CDFIs, city/state programs, and
              community capital. We slow down, look at your real context, and you
              leave with a grounded view of where you stand and what to do next.
            </p>

            <div className="space-y-3 text-sm sm:text-base">
              <h2 className="font-medium text-slate-100">
                In your Capital Clarity Session™, you get:
              </h2>
              <ul className="space-y-2 text-slate-200">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>
                    A{" "}
                    <strong className="font-semibold">
                      Readiness Scan (Red / Yellow / Green)
                    </strong>{" "}
                    across documentation, revenue stability, credit context, and
                    business model clarity — named plainly, without judgment.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>
                    A{" "}
                    <strong className="font-semibold">
                      Funding Pathways Snapshot
                    </strong>{" "}
                    across public, community, and CDFI options that could be
                    relevant to your situation{" "}
                    <span className="text-slate-300">
                      (non-prescriptive, non-broker, no sales agenda).
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>
                    A{" "}
                    <strong className="font-semibold">
                      3-step Next Moves Plan
                    </strong>{" "}
                    so you&apos;re not left in open-ended &quot;maybe later&quot;
                    territory.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-sm sm:text-base">
              <p className="font-medium text-emerald-300">Who this is for</p>
              <p className="text-slate-300">
                • NYC-based founders, freelancers, and small businesses
                <br />
                • Impact-driven, community-rooted, or regenerative businesses
                <br />
                • People who care about{" "}
                <span className="font-semibold">
                  non-extractive, non-predatory
                </span>{" "}
                paths to capital and want support making sense of their options
              </p>
            </div>

            <div className="space-y-1 text-sm sm:text-base">
              <p className="font-semibold text-slate-100">
                Pilot pricing: <span className="text-emerald-300">$175</span>
              </p>
              <p className="text-slate-400">
                You&apos;ll only be charged if we mutually confirm fit. No sales
                pressure — just an honest, structured look at where you are and
                what feels responsible next.
              </p>
            </div>

            <div className="mt-4">
              <a
                href="#book"
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-300 transition"
              >
                Start with a Capital Clarity Session
              </a>
              <p className="mt-2 text-[11px] text-slate-400">
                You&apos;ll answer a few questions first so we can make the
                session as useful, specific, and grounded in your reality as
                possible.
              </p>
            </div>
          </section>

          {/* Right: intake / Typeform */}
          <section
            id="book"
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/40"
          >
            <h2 className="mb-3 text-sm font-medium text-slate-100">
              Brief intake — ~5 minutes
            </h2>
            <p className="mb-4 text-xs text-slate-400 leading-relaxed">
              Share a bit about your business and funding situation. I&apos;ll
              review your responses and follow up to confirm fit, timing, and
              next steps for your Capital Clarity Session.
            </p>

            {/* Client component for Typeform */}
            <TypeformWidget formId="ONoqryDd" />

            <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
              This session is not financial, legal, or tax advice, and I don&apos;t
              sell loans. The aim is to help you see your position clearly,
              understand your options, and avoid extractive or misaligned products.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            © {year} Regenerative Capital Navigator™ · Path to Impact
          </p>
          <p className="text-[11px] text-slate-500">
            Centered on non-extractive, community-rooted capital pathways.
          </p>
        </div>
      </footer>
    </main>
  );
}
