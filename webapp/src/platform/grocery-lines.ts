/** Protects `72,5%` so catalog commas stay decimal separators, not item splits. */
const DECIMAL_COMMA_PLACEHOLDER = '\u2060'

function protectDecimalCommas(value: string) {
  return value.replace(/(\d),(\d)/g, `$1${DECIMAL_COMMA_PLACEHOLDER}$2`)
}

function restoreDecimalCommas(value: string) {
  return value.replaceAll(DECIMAL_COMMA_PLACEHOLDER, ',')
}

/** Catalog blobs mix product commas with notes like `в тесто` and `для подачи`. */
export function splitIngredientParts(ingredients: string): string[] {
  const source = protectDecimalCommas(ingredients)
  const parts: string[] = []
  let buffer = ''
  let depth = 0
  const flush = () => {
    const part = restoreDecimalCommas(buffer).trim().replace(/\.$/, '')
    buffer = ''
    if (part) parts.push(part)
  }
  for (const char of source) {
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (char === ',' || char === ';' || char === '\n')) {
      flush()
      continue
    }
    buffer += char
  }
  flush()
  return parts
}

/** Usage / grade / garnish fragments that are not store products. */
export function isCulinaryNote(part: string) {
  const text = part.trim().replace(/\.$/, '').replace(/\s+/g, ' ')
  if (!text) return true
  if (/^для(\s|$)/i.test(text)) return true
  if (/^в\s+(тесто|начинку|брикетах)(\s|$)/i.test(text)) return true
  if (/^(по вкусу|по желанию|или по вкусу)(\s|$)/i.test(text)) return true
  if (/^(молотый|свежий|сок и цедра|цедра|без горки)(\s|$)/i.test(text)) return true
  if (/^[cс][о0]$/i.test(text)) return true
  if (/^размер\s*с[о0]$/i.test(text)) return true
  if (/^\d+([.,]\d+)?\s*%$/.test(text)) return true
  if (
    /(в тесто|в начинку|для подачи|для обсыпки|для соуса)/i.test(text) &&
    !/[–—-]/.test(text)
  ) {
    return true
  }
  return false
}

/** Store-buyable grocery lines: drops garnish notes, egg grades, and usage tails. */
export function groceryShoppingLines(ingredients: string): string[] {
  return splitIngredientParts(ingredients).filter((part) => !isCulinaryNote(part))
}
