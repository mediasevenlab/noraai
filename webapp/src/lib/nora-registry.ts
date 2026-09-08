import componentsJson from "@/data/nora-components.json"
import blocksJson from "@/data/nora-blocks.json"

/** Метаданные примеров (разметка HTML больше не используется в рантайме) */
export type NoraExample = {
  title: string
  note?: string
}

export type NoraComponentEntry = {
  id: string
  name: string
  desc: string
  examples: NoraExample[]
}

export type NoraBlockEntry = {
  id: string
  name: string
  desc: string
  scheme: "editor-dark" | "editor-light" | "marketing" | null
}

function stripComponent(raw: {
  id: string
  name: string
  desc: string
  examples: { title: string; note?: string; html?: string }[]
}): NoraComponentEntry {
  return {
    id: raw.id,
    name: raw.name,
    desc: raw.desc,
    examples: raw.examples.map(({ title, note }) => ({ title, note })),
  }
}

function stripBlock(raw: {
  id: string
  name: string
  desc: string
  scheme: NoraBlockEntry["scheme"]
  html?: string
}): NoraBlockEntry {
  return {
    id: raw.id,
    name: raw.name,
    desc: raw.desc,
    scheme: raw.scheme,
  }
}

/** 26 компонентов Nora DS — метаданные; демо в nora-component-docs.tsx */
export const NORA_COMPONENT_REGISTRY = (
  componentsJson as Parameters<typeof stripComponent>[0][]
).map(stripComponent)

/** Блоки Nora DS — метаданные; рендер в nora-block-registry.tsx */
export const NORA_BLOCK_REGISTRY = (
  blocksJson as Parameters<typeof stripBlock>[0][]
).map(stripBlock)
