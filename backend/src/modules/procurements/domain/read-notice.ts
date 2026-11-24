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

const SKIP_NODE = new Set([
  'signature',
  'cryptoSigns',
  'printForm',
  'signatureInfo',
  'printFormInfo',
  'header',
  'extendedType',
  'guid',
  'contentUid',
  'saveUserId',
  'userSignature',
  'trustedSignature',
  'userSignatureUid',
  'trustedUserSignatureUid',
  'xsltFileDsUid',
])

const SECTION_TITLE: Record<string, string> = {
  commonInfo: 'Общие сведения',
  purchaseResponsibleInfo: 'Контакты',
  notificationInfo: 'Условия закупки',
  attachmentsInfo: 'Вложения',
  serviceSigns: 'Служебные признаки',
  modificationInfo: 'Изменения',
  documentation: 'Документация',
  lot: 'Лот',
  lots: 'Лоты',
  lotData: 'Лот',
  lotItems: 'Позиции',
  lotItem: 'Позиция',
  customer: 'Заказчик',
  placer: 'Организатор',
  contact: 'Контакт',
  mainInfo: 'Организация',
  documentationDelivery: 'Документация',
  attachments: 'Вложения',
  document: 'Файл',
  deliveryPlace: 'Место поставки',
  currency: 'Валюта',
  okpd2: 'ОКПД2',
  okved2: 'ОКВЭД2',
  timeZone: 'Часовой пояс',
}

const FIELD_TITLE: Record<string, string> = {
  purchaseNumber: 'Номер',
  purchaseObjectInfo: 'Предмет',
  subject: 'Предмет',
  fullName: 'Организация',
  name: 'Название',
  maxPrice: 'Начальная цена',
  initialSum: 'Начальная цена',
  price: 'Цена',
  quantity: 'Количество',
  publishDTInEIS: 'Опубликовано',
  publicationDateTime: 'Опубликовано',
  endDT: 'Окончание подачи заявок',
  submissionCloseDateTime: 'Окончание подачи заявок',
  contactEMail: 'Почта',
  contactPhone: 'Телефон',
  lastName: 'Фамилия',
  firstName: 'Имя',
  middleName: 'Отчество',
  INN: 'ИНН',
  KPP: 'КПП',
  factAddress: 'Адрес',
  deliveryPlace: 'Место поставки',
  GARAddress: 'Адрес поставки',
  fileName: 'Файл',
  docDescription: 'Описание файла',
  url: 'Ссылка',
  href: 'Ссылка',
  amount: 'Сумма',
  part: 'Доля',
  purchaseCode: 'Идентификационный код',
  placingWay: 'Способ',
  urlEIS: 'Карточка на сайте',
  registrationNumber: 'Номер',
  purchaseMethodCode: 'Код способа',
  purchaseCodeName: 'Способ',
  modificationDate: 'Изменено',
  deliveryStartDateTime: 'Начало выдачи документации',
  deliveryEndDateTime: 'Окончание выдачи документации',
  place: 'Место',
  procedure: 'Порядок',
  status: 'Статус',
  version: 'Версия',
  email: 'Почта',
  phone: 'Телефон',
  shortName: 'Краткое название',
  iko: 'ИКО',
  ogrn: 'ОГРН',
  legalAddress: 'Юридический адрес',
  postalAddress: 'Почтовый адрес',
  okato: 'ОКАТО',
  okopf: 'Код ОКОПФ',
  okopfName: 'ОКОПФ',
  okpo: 'ОКПО',
  okfs: 'Код ОКФС',
  okfsName: 'ОКФС',
  region: 'Регион',
  description: 'Описание',
  ordinalNumber: 'Номер',
  additionalInfo: 'Дополнительно',
  code: 'Код',
  inn: 'ИНН',
  kpp: 'КПП',
  createDateTime: 'Дата создания',
  notDishonest: 'Не в реестре недобросовестных',
  deliveryPlaceIndication: 'Признак места поставки',
  emergency: 'Срочная закупка',
  jointPurchase: 'Совместная закупка',
  hidePurchase: 'Скрытая закупка',
  antimonopolyDecisionTaken: 'Решение антимонопольного органа',
  isLotOriented: 'Полотовая закупка',
  offset: 'Смещение часового пояса',
  budgetAgencyType: 'Тип организации',
  lotEditEnabled: 'Редактирование лота',
  digitalCode: 'Цифровой код',
  state: 'Субъект',
  regionOkato: 'ОКАТО региона',
  address: 'Адрес',
  newCodes: 'Новые коды',
  superiorityNationalRegime: 'Преимущество нацрежима',
  prohibitionNationalRegime: 'Запрет нацрежима',
  constraintNationalRegime: 'Ограничение нацрежима',
  exceptionNationalRegime: 'Исключение нацрежима',
  forSmallOrMiddle: 'Для малого и среднего бизнеса',
  excludePurchaseFromPlan: 'Исключить из плана',
  subcontractorsRequirement: 'Требование о субподряде',
  ignoredPurchase: 'Не учитывать в закупках',
  centralized: 'Централизованная закупка',
  jointLot: 'Совместный лот',
  planRegistrationNumber: 'Регистрационный номер плана',
  planGuid: 'Идентификатор плана',
  positionNumber: 'Номер позиции',
  lotPlanPosition: 'Позиция плана лота',
  positionGuid: 'Идентификатор позиции',
  cancelled: 'Отменено',
  totalDocumentsCount: 'Общее количество документов',
}

export type NoticeDocument = {
  sections: { title: string; fields: { label: string; value: string }[] }[]
}

/** Readable sections of one saved notice. Signatures and print forms stay out. */
export function readNoticeDocument(xml: string): NoticeDocument {
  const root = parseXml(xml)
  const notice = findByName(root, 'purchaseNoticeData') ?? firstContent(root)
  const sections: NoticeDocument['sections'] = []
  const common: { label: string; value: string }[] = []
  for (const child of notice.children) {
    if (SKIP_NODE.has(child.name)) continue
    const fields = uniqueFields(collectFields(child)).slice(0, 120)
    if (fields.length === 0) continue
    if (child.children.length === 0) common.push(...fields)
    else sections.push({ title: SECTION_TITLE[child.name] ?? humanName(child.name), fields })
    if (sections.length >= 40) break
  }
  if (common.length > 0) sections.unshift({ title: 'Общие сведения', fields: uniqueFields(common).slice(0, 120) })
  return { sections: sections.slice(0, 40) }
}

function firstContent(node: XmlNode) {
  return node.children.find((child) => child.children.length > 0 && !SKIP_NODE.has(child.name)) ?? node
}

function findByName(node: XmlNode, name: string): XmlNode | null {
  if (node.name === name) return node
  for (const child of node.children) {
    const found = findByName(child, name)
    if (found) return found
  }
  return null
}

function collectFields(node: XmlNode): { label: string; value: string }[] {
  if (SKIP_NODE.has(node.name)) return []
  if (node.name === 'document') return documentFields(node)
  if (node.children.length === 0) {
    const value = showField(node.name, node.text.trim())
    if (!value || value.length > 2000) return []
    return [{ label: FIELD_TITLE[node.name] ?? humanName(node.name), value }]
  }
  return node.children.flatMap((child) => collectFields(child)).slice(0, 120)
}

function documentFields(node: XmlNode) {
  const fileName = childText(node, 'fileName')
  const url = childText(node, 'url')
  const description = childText(node, 'description')
  const fields: { label: string; value: string }[] = []
  if (fileName && url) fields.push({ label: 'Файл', value: `${fileName}\n${url}` })
  else if (url) fields.push({ label: 'Ссылка', value: url })
  else if (fileName) fields.push({ label: 'Файл', value: fileName })
  if (description && !sameFileText(fileName, description)) fields.push({ label: 'Описание', value: description })
  return fields
}

function childText(node: XmlNode, name: string) {
  return node.children.find((child) => child.name === name)?.text.trim() ?? ''
}

function sameFileText(fileName: string, description: string) {
  const file = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').trim()
  const note = description.trim()
  if (!note || !file) return false
  return note === fileName || note === file || file.startsWith(note) || note.startsWith(file)
}

function uniqueFields(fields: { label: string; value: string }[]) {
  const seen = new Set<string>()
  return fields.filter((field) => {
    const key = `${field.label}\n${field.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function showField(name: string, value: string) {
  if (!value || /^\s*[A-Za-z0-9+/=]{80,}\s*$/.test(value)) return ''
  if (value === 'true' || value === 'false') return value === 'true' ? 'Да' : 'Нет'
  if (name === 'maxPrice' || name === 'initialSum' || name === 'price' || name === 'amount') {
    return Number.isFinite(Number(value)) ? `${money(value)} ₽` : value
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return ruDate(value)
  return value
}

function humanName(name: string) {
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name
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
