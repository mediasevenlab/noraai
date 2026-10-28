import { escapeCurrencyDollars, normalizeMathDelimiters } from '@assistant-ui/react-markdown'

const MARKDOWN_STRUCTURE = /^(?:[ \t]*(?:#{1,6}\s|>|[-*+]\s|\d+\.\s|\|))/

/** A single newline between ordinary lines is a visible break. Lists, headings and code fences stay intact. */
function keepPlainLineBreaks(text: string) {
  return text
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((part, index) => (index % 2 === 1 ? part : breakPlainLines(part)))
    .join('')
}

function breakPlainLines(part: string) {
  const lines = part.split('\n')
  let result = ''
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    result += line
    if (index === lines.length - 1) break
    const next = lines[index + 1] ?? ''
    const keepsBreak = line.trim() === '' || next.trim() === '' || MARKDOWN_STRUCTURE.test(line) || MARKDOWN_STRUCTURE.test(next)
    result += keepsBreak ? '\n' : '  \n'
  }
  return result
}

const SCHEME_IMAGE = /!\[[^\]]*\]\((\/api\/users\/me\/knowledge-schemes\/[^)\s]+)\)/g
const SCHEME_RUN = /(?:!\[[^\]]*\]\(\/api\/users\/me\/knowledge-schemes\/[^)\s]+\)[ \t]*\n*){2,}/g

/** Several scheme drawings that follow one another stay under the text, on one line. */
function groupSchemeImages(text: string) {
  return text.replace(SCHEME_RUN, (run) => {
    const sources: string[] = []
    for (const match of run.matchAll(SCHEME_IMAGE)) {
      const src = match[1]
      if (src && !sources.includes(src)) sources.push(src)
    }
    return `${sources.map((src) => `![Схема](${src})`).join(' ')}\n`
  })
}

/** LaTeX brackets become dollar math, and prices stay prices. */
export function prepareDialogMarkdown(text: string) {
  return groupSchemeImages(keepPlainLineBreaks(escapeCurrencyDollars(normalizeMathDelimiters(text))))
}
