import iconsJson from "@/data/nora-icons.json"
import tokensJson from "@/data/nora-tokens.json"

export type NoraIcon = {
  id: string
  w: number
  h: number
  svg: string
  src: string
}

export const NORA_ICONS: NoraIcon[] = iconsJson as NoraIcon[]

export type NoraTokens = {
  light: Record<string, string>
  dark: Record<string, string>
}

export const NORA_TOKENS: NoraTokens = tokensJson as NoraTokens

/** Ключевые цвета Nora, использованные в теме Nora UI */
export const NORA_PALETTE = [
  { name: "Tint", value: "#0099ff", usage: "primary — акцент, кнопки, ссылки, выделение" },
  { name: "Component Tint", value: "#8855ff", usage: "компоненты, code components" },
  { name: "Error Tint", value: "#ff3366", usage: "destructive — ошибки, удаление" },
  { name: "Warning Tint", value: "#ffbb00", usage: "предупреждения" },
  { name: "Success", value: "#00cc88", usage: "успешные состояния, графики" },
  { name: "Panel Dark", value: "#111111", usage: "сайдбары и панели тёмной темы" },
  { name: "Canvas Dark", value: "#171717", usage: "фон рабочей области (dark)" },
  { name: "Input Dark", value: "#1f1f1f", usage: "поля ввода, secondary (dark)" },
  { name: "Canvas Light", value: "#eeeeee", usage: "фон рабочей области (light)" },
  { name: "Input Light", value: "#f3f3f3", usage: "поля ввода, secondary (light)" },
  { name: "Text Secondary Dark", value: "#999999", usage: "muted-foreground (dark)" },
  { name: "Text Secondary Light", value: "#666666", usage: "muted-foreground (light)" },
] as const
