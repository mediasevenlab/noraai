export type NoticeCard = {
  documentKind: string
  documentTitle: string
  schemeVersion: string
  positionCount: number
  sections: { title: string; fields: { label: string; value: string }[] }[]
  blocks: { name: string; hint: string }[]
  attachments: { name: string; bytes: number; size: string; url: string }[]
  attachmentBytes: number
  attachmentSize: string
  positions: { name: string; unit: string; price: string; quantity: string }[]
}

const BLOCK_HINT: Record<string, string> = {
  id: 'служебный идентификатор',
  versionNumber: 'номер версии извещения',
  commonInfo: 'номер, предмет, способ и площадка',
  purchaseResponsibleInfo: 'кто разместил извещение и как связаться',
  printFormInfo: 'печатная форма и электронная подпись',
  attachmentsInfo: 'вложенные файлы',
  serviceSigns: 'служебные признаки',
  notificationInfo: 'сроки, цена, заказчик, обеспечение и позиции',
}

type XmlNode = {
  name: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

export function readNoticeXml(xml: string): NoticeCard {
  const root = parseXml(xml)
  const notice = root.children.find((node) => node.name === 'epNotificationEF2020') ?? root
  const sections = [
    section(notice, 'Извещение', [
      ['Номер', ['commonInfo', 'purchaseNumber']],
      ['Предмет', ['commonInfo', 'purchaseObjectInfo']],
      ['Способ', ['commonInfo', 'placingWay', 'name']],
      ['Площадка', ['commonInfo', 'ETP', 'name']],
      ['Опубликовано', ['commonInfo', 'publishDTInEIS']],
      ['Окончание подачи заявок', ['notificationInfo', 'procedureInfo', 'collectingInfo', 'endDT']],
      ['Дата аукциона', ['notificationInfo', 'procedureInfo', 'biddingDate']],
      ['Подведение итогов', ['notificationInfo', 'procedureInfo', 'summarizingDate']],
      ['Начальная цена', ['notificationInfo', 'contractConditionsInfo', 'maxPriceInfo', 'maxPrice']],
      ['Карточка на сайте', ['commonInfo', 'href']],
    ]),
    section(notice, 'Заказчик', [
      ['Организация', ['purchaseResponsibleInfo', 'responsibleOrgInfo', 'fullName']],
      ['Заказчик', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'customer', 'fullName']],
      ['ИНН', ['purchaseResponsibleInfo', 'responsibleOrgInfo', 'INN']],
      ['КПП', ['purchaseResponsibleInfo', 'responsibleOrgInfo', 'KPP']],
      ['Адрес', ['purchaseResponsibleInfo', 'responsibleOrgInfo', 'factAddress']],
      ['Контакт', ['purchaseResponsibleInfo', 'responsibleInfo', 'contactPersonInfo', 'lastName']],
      ['Телефон', ['purchaseResponsibleInfo', 'responsibleInfo', 'contactPhone']],
      ['Почта', ['purchaseResponsibleInfo', 'responsibleInfo', 'contactEMail']],
    ]),
    section(notice, 'Исполнение', [
      ['Начало', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'contractExecutionPaymentPlan', 'contractExecutionTermsInfo', 'notRelativeTermsInfo', 'startDate']],
      ['Окончание', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'contractExecutionPaymentPlan', 'contractExecutionTermsInfo', 'notRelativeTermsInfo', 'endDate']],
      ['Бюджет', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'contractExecutionPaymentPlan', 'financingSourcesInfo', 'budgetFinancingsInfo', 'budgetInfo', 'name']],
      ['Идентификационный код', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'IKZInfo', 'purchaseCode']],
      ['Место поставки', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'deliveryPlacesInfo', 'byGARInfo', 'GARInfo', 'GARAddress']],
      ['Уточнение места', ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo', 'contractConditionsInfo', 'deliveryPlacesInfo', 'byGARInfo', 'deliveryPlace']],
    ]),
  ].map((item) => ({
    ...item,
    fields: item.fields.map((field) =>
      field.label === 'Контакт' ? { ...field, value: personName(notice) || field.value } : field,
    ),
  }))
  const security = securitySection(notice)
  if (security.fields.length > 0) {
    const customerAt = sections.findIndex((item) => item.title === 'Заказчик')
    sections.splice(customerAt === -1 ? sections.length : customerAt + 1, 0, security)
  }

  const attachments = findAll(notice, 'attachmentInfo').flatMap(readAttachment)
  const attachmentBytes = attachments.reduce((sum, file) => sum + file.bytes, 0)
  const positions = findAll(notice, 'purchaseObject').flatMap(readPosition)

  return {
    documentKind: notice.name,
    documentTitle: textAt(notice, ['commonInfo', 'purchaseObjectInfo']) || 'Извещение ЕИС',
    schemeVersion: notice.attrs.schemeVersion || '—',
    positionCount: positions.length,
    sections: sections.filter((item) => item.fields.length > 0),
    blocks: notice.children.map((node) => ({
      name: node.name,
      hint: BLOCK_HINT[node.name] ?? 'блок XML',
    })),
    attachments,
    attachmentBytes,
    attachmentSize: formatBytes(attachmentBytes),
    positions,
  }
}

function securitySection(notice: XmlNode) {
  const requirement = at(notice, ['notificationInfo', 'customerRequirementsInfo', 'customerRequirementInfo'])
  return {
    title: 'Обеспечение',
    fields: [
      guaranteeField('Обеспечение заявки', requirement, 'applicationGuarantee'),
      guaranteeField('Обеспечение контракта', requirement, 'contractGuarantee'),
    ].filter((field) => field.value),
  }
}

function guaranteeField(label: string, requirement: XmlNode | undefined, name: string) {
  const node = requirement?.children.find((child) => child.name === name)
  const amount = node ? textAt(node, ['amount']) : ''
  const part = node ? textAt(node, ['part']) : ''
  const parts = [amount ? `${money(amount)} ₽` : '', part ? percent(part) : ''].filter(Boolean)
  return { label, value: parts.join(', ') }
}

function readAttachment(node: XmlNode) {
  const name = textAt(node, ['fileName']) || textAt(node, ['docDescription'])
  const bytes = Number(textAt(node, ['fileSize']))
  if (!name || !Number.isInteger(bytes) || bytes < 0) return []
  return [{ name, bytes, size: formatBytes(bytes), url: textAt(node, ['url']) }]
}

function readPosition(node: XmlNode) {
  const name = textAt(node, ['name'])
  if (!name) return []
  const shortUnit = textAt(node, ['OKEI', 'nationalCode'])
  const unit = shortUnit && !shortUnit.includes('[') ? shortUnit : textAt(node, ['OKEI', 'name']) || shortUnit
  const price = textAt(node, ['price'])
  return [{ name, unit, price: price ? `${money(price)} ₽` : '', quantity: quantityText(node) }]
}

function quantityText(node: XmlNode) {
  const quantity = node.children.find((child) => child.name === 'quantity')
  if (!quantity) return ''
  if (quantity.children.some((child) => child.name === 'undefined' && child.text.trim() === 'true')) return 'не задан'
  return textAt(quantity, ['value'])
}

function percent(value: string) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  const rounded = Math.round(number * 100) / 100
  const [whole, fraction = ''] = String(rounded).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${fraction ? `,${fraction}` : ''}%`
}

function formatBytes(bytes: number) {
  const exact = String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  if (bytes < 1024) return `${exact} Б`
  const kilo = bytes / 1024
  if (kilo < 1024) return `${exact} байт (${shortNumber(kilo)} КБ)`
  return `${exact} байт (${shortNumber(kilo / 1024)} МБ)`
}

function shortNumber(value: number) {
  const rounded = Math.round(value * 10) / 10
  const [whole, fraction = '0'] = rounded.toFixed(1).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return fraction === '0' ? grouped : `${grouped},${fraction}`
}

function section(notice: XmlNode, title: string, fields: [string, string[]][]) {
  return {
    title,
    fields: fields
      .map(([label, path]) => ({ label, value: show(label, textAt(notice, path)) }))
      .filter((field) => field.value),
  }
}

function personName(notice: XmlNode) {
  const person = at(notice, ['purchaseResponsibleInfo', 'responsibleInfo', 'contactPersonInfo'])
  if (!person) return ''
  return ['lastName', 'firstName', 'middleName']
    .map((name) => person.children.find((node) => node.name === name)?.text.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}

function show(label: string, value: string) {
  if (!value) return ''
  if (label === 'Начальная цена') return `${money(value)} ₽`
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return ruDate(value)
  return value
}

function money(value: string) {
  const [rubles, kopecks = '00'] = value.split('.')
  const grouped = rubles.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped},${kopecks.padEnd(2, '0').slice(0, 2)}`
}

function ruDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?(?:([+-]\d{2}):?\d{2})?/)
  if (!match) return value
  const [, year, month, day, hour, minute, zone] = match
  const date = `${day}.${month}.${year}`
  if (!hour) return date
  const offset = zone ? ` (UTC${zone.replace(/^([+-])0/, '$1')})` : ''
  return `${date} ${hour}:${minute}${offset}`
}

function textAt(node: XmlNode, path: string[]) {
  return at(node, path)?.text.trim() ?? ''
}

function at(node: XmlNode, path: string[]) {
  let current: XmlNode | undefined = node
  for (const name of path) {
    current = current?.children.find((child) => child.name === name)
  }
  return current
}

function findAll(node: XmlNode, name: string): XmlNode[] {
  const found: XmlNode[] = []
  for (const child of node.children) {
    if (child.name === name) found.push(child)
    else found.push(...findAll(child, name))
  }
  return found
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' }
  const stack = [root]
  let index = 0
  while (index < xml.length) {
    if (xml.startsWith('<?', index)) {
      index = xml.indexOf('?>', index) + 2
      continue
    }
    if (xml.startsWith('<!--', index)) {
      index = xml.indexOf('-->', index) + 3
      continue
    }
    if (xml[index] !== '<') {
      const next = xml.indexOf('<', index)
      const chunk = xml.slice(index, next === -1 ? xml.length : next)
      stack.at(-1)!.text += decode(chunk)
      index = next === -1 ? xml.length : next
      continue
    }
    if (xml.startsWith('</', index)) {
      const end = xml.indexOf('>', index)
      stack.pop()
      index = end + 1
      continue
    }
    const end = xml.indexOf('>', index)
    let raw = xml.slice(index + 1, end)
    const selfClosing = raw.endsWith('/')
    if (selfClosing) raw = raw.slice(0, -1).trimEnd()
    const name = raw.match(/^[\w:.-]+/)?.[0] ?? ''
    const attrs: Record<string, string> = {}
    for (const match of raw.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
      attrs[localName(match[1])] = decode(match[2])
    }
    const node: XmlNode = { name: localName(name), attrs, children: [], text: '' }
    stack.at(-1)!.children.push(node)
    if (!selfClosing) stack.push(node)
    index = end + 1
  }
  return root.children[0] ?? root
}

function localName(name: string) {
  const colon = name.indexOf(':')
  return colon === -1 ? name : name.slice(colon + 1)
}

function decode(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}
