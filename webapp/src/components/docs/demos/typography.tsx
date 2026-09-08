import type { ComponentDoc } from "./types"

/** Nora / Nora UI type scale — Inter Display for headings, Inter for body */
export const typographyDoc: ComponentDoc = {
  id: "typography",
  examples: [
    {
      title: "Headings",
      description: "Inter Display hierarchy — tracking tight.",
      code: `<h1 className="font-heading text-4xl font-semibold tracking-[-0.02em]">
  Taxing Laughter
</h1>`,
      render: () => (
        <div className="max-w-xl space-y-3 text-[var(--nora-text)]">
          <h1 className="font-heading scroll-m-20 text-4xl font-semibold tracking-[-0.02em] text-balance">
            Taxing Laughter: The Joke Tax Chronicles
          </h1>
          <h2 className="font-heading scroll-m-20 border-b border-[var(--nora-divider)] pb-2 text-2xl font-semibold tracking-[-0.02em]">
            The People of the Kingdom
          </h2>
          <h3 className="font-heading scroll-m-20 text-xl font-semibold tracking-[-0.015em]">
            The Joke Tax
          </h3>
          <h4 className="font-heading scroll-m-20 text-[15px] font-semibold tracking-[-0.01em]">
            People stopped telling jokes
          </h4>
        </div>
      ),
    },
    {
      title: "Paragraph & lead",
      description: "Body 13/regular · lead secondary.",
      code: `<p className="text-[13px] leading-relaxed">…</p>
<p className="text-[15px] text-[var(--nora-text-secondary)]">Lead</p>`,
      render: () => (
        <div className="max-w-xl space-y-3 font-[family-name:var(--nora-font)] text-[var(--nora-text)]">
          <p className="text-[15px] font-medium leading-relaxed text-[var(--nora-text-secondary)]">
            A modal dialog that interrupts the user with important content.
          </p>
          <p className="text-[13px] font-medium leading-relaxed text-[var(--nora-text)]">
            The king, seeing how much happier his subjects were, realized the
            error of his judgment and repealed the joke tax.
          </p>
        </div>
      ),
    },
    {
      title: "UI labels",
      description: "Nora panel density — 12 / 11 / tertiary.",
      code: `<span className="text-xs font-medium">Label</span>
<span className="text-[11px] text-[var(--nora-text-tertiary)]">Hint</span>`,
      render: () => (
        <div className="flex w-full max-w-[280px] flex-col gap-2 font-[family-name:var(--nora-font)]">
          <div className="flex h-[var(--nora-row-h,30px)] items-center justify-between">
            <span className="text-xs font-medium text-[var(--nora-text)]">
              Opacity
            </span>
            <span className="text-[11px] font-medium text-[var(--nora-text-tertiary)]">
              100%
            </span>
          </div>
          <div className="flex h-[var(--nora-row-h,30px)] items-center justify-between">
            <span className="text-xs font-medium text-[var(--nora-text-secondary)]">
              Section
            </span>
            <span className="text-[11px] font-medium text-[var(--nora-text-tertiary)]">
              Design
            </span>
          </div>
          <p className="text-[11px] font-medium leading-snug text-[var(--nora-text-tertiary)]">
            Helper copy under a field — 11px tertiary.
          </p>
        </div>
      ),
    },
    {
      title: "Lists & inline",
      description: "Lists, code chip, link, blockquote.",
      code: `<ul className="list-disc">…</ul>
<code className="rounded bg-[var(--nora-input-bg)] px-1.5">npm</code>`,
      render: () => (
        <div className="max-w-xl space-y-3 font-[family-name:var(--nora-font)] text-[13px] font-medium text-[var(--nora-text)]">
          <ul className="ml-5 list-disc space-y-1 text-[var(--nora-text-secondary)]">
            <li>1st level of puns: 5 gold coins</li>
            <li>2nd level of jokes: 10 gold coins</li>
            <li>3rd level of one-liners: 20 gold coins</li>
          </ul>
          <p>
            You can use{" "}
            <code className="rounded-[var(--nora-radius-xs,4px)] bg-[var(--nora-input-bg)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--nora-text)]">
              npx shadcn@latest add
            </code>{" "}
            to install components. Visit{" "}
            <a
              href="https://ui.shadcn.com"
              className="font-medium text-[var(--nora-tint)] underline underline-offset-4"
            >
              ui.shadcn.com
            </a>
            .
          </p>
          <blockquote className="border-l-2 border-[var(--nora-divider)] pl-3 text-[var(--nora-text-secondary)] italic">
            &ldquo;After all,&rdquo; he said, &ldquo;everyone enjoys a good
            joke.&rdquo;
          </blockquote>
        </div>
      ),
    },
  ],
}
