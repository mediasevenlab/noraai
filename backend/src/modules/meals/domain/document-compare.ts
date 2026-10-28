const SIDE_LIMIT = 5000

export function clipCompareSide(text: string, limit = SIDE_LIMIT) {
  const trimmed = text.replace(/\u0000/g, '').trim()
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, limit)}\n…`
}

export function documentComparePrompt(input: {
  leftName: string
  leftText: string
  rightName: string
  rightText: string
}) {
  return [
    `Первый документ «${input.leftName}»:`,
    clipCompareSide(input.leftText),
    '',
    `Второй документ «${input.rightName}»:`,
    clipCompareSide(input.rightText),
  ].join('\n')
}

export const DOCUMENT_COMPARE_SYSTEM = [
  'Тебе дают две версии одного документа. Первая — исходная, вторая — следующая правка.',
  'Напиши по-русски, что изменилось: что добавили, что удалили и что переписали.',
  'Не пересказывай текст, который остался прежним.',
  'Несколько коротких абзацев, без нумерации и без кавычек вокруг всего ответа.',
].join(' ')
