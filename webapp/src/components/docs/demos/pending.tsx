import type { ComponentDoc } from "./types"

export function pendingDemo(id: string): ComponentDoc {
  return {
    id,
    examples: [
      {
        title: "Component available via CLI — demos pending",
        description: `Install with \`npx shadcn@latest add ${id}\` then demos will be expanded here.`,
        code: `// npx shadcn@latest add ${id}`,
        render: () => (
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-foreground">
              Component available via CLI — demos pending
            </p>
            <p className="text-xs text-muted-foreground">
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem]">
                npx shadcn@latest add {id}
              </code>{" "}
              to install.
            </p>
          </div>
        ),
      },
    ],
  }
}
