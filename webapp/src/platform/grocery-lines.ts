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

const GROCERY_UNIT_PATTERN =
  'кг|грамм(?:а|ов)?|гр|г|мл|л|шт\\.?|ч\\.?\\s*л\\.?|ст\\.?\\s*л\\.?|зуб(?:чик(?:а|ов)?)?\\.?|щепотка(?:\\s*\\(-и\\))?'

const GROCERY_AMOUNT_PATTERN = new RegExp(
  `(?:~\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(${GROCERY_UNIT_PATTERN})(?=$|[\\s,;.(]|$)`,
  'i',
)

type GroceryUnitFamily = 'g' | 'ml' | 'pcs' | 'tsp' | 'tbsp' | 'clove' | 'pinch'

type GroceryBucket = {
  displayName: string
  family: GroceryUnitFamily | null
  baseQty: number | null
  original: string
  merged: boolean
}

function foldGroceryUnit(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace('(-и)', '')
}

function groceryUnitInfo(raw: string): { family: GroceryUnitFamily; toBase: number } | null {
  const unit = foldGroceryUnit(raw)
  if (unit === 'кг') return { family: 'g', toBase: 1000 }
  if (unit === 'г' || unit === 'гр' || unit.startsWith('грамм')) return { family: 'g', toBase: 1 }
  if (unit === 'л') return { family: 'ml', toBase: 1000 }
  if (unit === 'мл') return { family: 'ml', toBase: 1 }
  if (unit.startsWith('шт')) return { family: 'pcs', toBase: 1 }
  if (unit.startsWith('чл')) return { family: 'tsp', toBase: 1 }
  if (unit.startsWith('стл')) return { family: 'tbsp', toBase: 1 }
  if (unit.startsWith('зуб')) return { family: 'clove', toBase: 1 }
  if (unit.startsWith('щепотка')) return { family: 'pinch', toBase: 1 }
  return null
}

function groceryNameKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function formatGroceryQty(value: number) {
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

function formatGroceryBucket(bucket: GroceryBucket) {
  if (!bucket.merged) return bucket.original
  if (bucket.baseQty == null || bucket.family == null) return bucket.displayName
  let qty = bucket.baseQty
  let unit = ''
  if (bucket.family === 'g') {
    if (qty >= 1000 && qty % 1000 === 0) {
      qty /= 1000
      unit = 'кг'
    } else unit = 'г'
  } else if (bucket.family === 'ml') {
    if (qty >= 1000 && qty % 1000 === 0) {
      qty /= 1000
      unit = 'л'
    } else unit = 'мл'
  } else if (bucket.family === 'pcs') unit = 'шт'
  else if (bucket.family === 'tsp') unit = 'ч.л'
  else if (bucket.family === 'tbsp') unit = 'ст.л'
  else if (bucket.family === 'clove') unit = 'зуб'
  else unit = 'щепотка'
  return `${bucket.displayName} – ${formatGroceryQty(qty)} ${unit}`
}

function parseGroceryLine(label: string) {
  const text = label.trim().replace(/\.$/, '')
  const dash = text.search(/\s*[–—-]\s*/)
  const nameFromDash = dash >= 0 ? text.slice(0, dash).trim() : ''
  const rest = dash >= 0 ? text.slice(dash).replace(/^\s*[–—-]\s*/, '') : text
  const match = rest.match(GROCERY_AMOUNT_PATTERN)
  if (!match?.[1] || !match[2]) {
    return { displayName: text, family: null, baseQty: null, key: groceryNameKey(text) }
  }
  const info = groceryUnitInfo(match[2])
  if (!info) {
    return { displayName: text, family: null, baseQty: null, key: groceryNameKey(text) }
  }
  const qty = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(qty) || qty <= 0) {
    return { displayName: text, family: null, baseQty: null, key: groceryNameKey(text) }
  }
  const name =
    nameFromDash ||
    rest.slice(0, match.index ?? 0).replace(/[\s–—-]+$/g, '').trim() ||
    text
  return {
    displayName: name,
    family: info.family,
    baseQty: qty * info.toBase,
    key: `${groceryNameKey(name)}|${info.family}`,
  }
}

/** One cart row per product: same name and unit family are summed. */
export function mergeGroceryShoppingLines(labels: readonly string[]): string[] {
  const order: string[] = []
  const buckets = new Map<string, GroceryBucket>()
  for (const label of labels) {
    const parsed = parseGroceryLine(label)
    const existing = buckets.get(parsed.key)
    if (!existing) {
      order.push(parsed.key)
      buckets.set(parsed.key, {
        displayName: parsed.displayName,
        family: parsed.family,
        baseQty: parsed.baseQty,
        original: label,
        merged: false,
      })
      continue
    }
    existing.merged = true
    if (parsed.baseQty != null) {
      existing.baseQty = (existing.baseQty ?? 0) + parsed.baseQty
      if (existing.family == null) existing.family = parsed.family
    }
  }
  return order.map((key) => formatGroceryBucket(buckets.get(key)!))
}
