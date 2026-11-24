import { deflateRawSync } from 'node:zlib'
import { describe, expect, test } from 'bun:test'

import { readNoticeDocument, readNoticeXml } from './read-notice'
import { readZipXml } from './zip-xml'

const NOTICE = `<?xml version="1.0" encoding="UTF-8"?>
<ns3:export xmlns:ns3="http://zakupki.gov.ru/oos/export/1">
  <ns3:epNotificationEF2020 schemeVersion="16.3">
    <ns3:commonInfo>
      <ns3:purchaseNumber>0156100010726000075</ns3:purchaseNumber>
      <ns3:purchaseObjectInfo>Услуги по обслуживанию зданий</ns3:purchaseObjectInfo>
      <ns3:publishDTInEIS>2026-11-09T19:19:37.234+05:00</ns3:publishDTInEIS>
      <ns3:href>https://zakupki.gov.ru/epz/order/notice/ea20/view/common-info.html?regNumber=0156100010726000075</ns3:href>
      <ns3:placingWay><ns3:name>Электронный аукцион</ns3:name></ns3:placingWay>
      <ns3:ETP><ns3:name>АО «Сбербанк-АСТ»</ns3:name></ns3:ETP>
    </ns3:commonInfo>
    <ns3:purchaseResponsibleInfo>
      <ns3:responsibleOrgInfo>
        <ns3:fullName>СУ СК РОССИИ ПО ПЕРМСКОМУ КРАЮ</ns3:fullName>
        <ns3:INN>5902293749</ns3:INN>
      </ns3:responsibleOrgInfo>
      <ns3:responsibleInfo>
        <ns3:contactPersonInfo>
          <ns3:lastName>Иванова</ns3:lastName>
          <ns3:firstName>Мария</ns3:firstName>
        </ns3:contactPersonInfo>
        <ns3:contactPhone>7-342-0000000</ns3:contactPhone>
      </ns3:responsibleInfo>
    </ns3:purchaseResponsibleInfo>
    <ns3:notificationInfo>
      <ns3:procedureInfo>
        <ns3:collectingInfo><ns3:endDT>2026-11-17T09:00:00+05:00</ns3:endDT></ns3:collectingInfo>
      </ns3:procedureInfo>
      <ns3:contractConditionsInfo>
        <ns3:maxPriceInfo><ns3:maxPrice>991587.00</ns3:maxPrice></ns3:maxPriceInfo>
      </ns3:contractConditionsInfo>
      <ns3:purchaseObjectsInfo>
        <ns3:purchaseObject><ns3:name>Одна</ns3:name></ns3:purchaseObject>
        <ns3:purchaseObject><ns3:name>Другая</ns3:name></ns3:purchaseObject>
      </ns3:purchaseObjectsInfo>
    </ns3:notificationInfo>
  </ns3:epNotificationEF2020>
</ns3:export>`

test('notice card lists attached files with their total size, security and positions', () => {
  const card = readNoticeXml(NOTICE_WITH_FILES)
  expect(card.attachmentBytes).toBe(109569)
  expect(card.attachmentSize).toBe('109 569 байт (107 КБ)')
  expect(card.attachments).toEqual([
    {
      name: 'Обоснование НМЦК.docx',
      bytes: 20493,
      size: '20 493 байт (20 КБ)',
      url: 'https://zakupki.gov.ru/44fz/filestore/public/1.0/download/priz/file.html?uid=file-1',
    },
    {
      name: 'Проект контракта.docx',
      bytes: 89076,
      size: '89 076 байт (87 КБ)',
      url: 'https://zakupki.gov.ru/44fz/filestore/public/1.0/download/priz/file.html?uid=file-2',
    },
  ])
  expect(card.sections.find((section) => section.title === 'Обеспечение')?.fields).toEqual([
    { label: 'Обеспечение заявки', value: '9 915,87 ₽, 1%' },
    { label: 'Обеспечение контракта', value: '10%' },
  ])
  expect(card.sections.find((section) => section.title === 'Заказчик')?.fields).toEqual(
    expect.arrayContaining([{ label: 'Заказчик', value: 'СЛЕДСТВЕННОЕ УПРАВЛЕНИЕ' }]),
  )
  expect(card.positions).toEqual([
    { name: 'Прокладка трубы', unit: 'пог. м', price: '2 500,00 ₽', quantity: 'не задан' },
    { name: 'Замена трубы', unit: 'Квадратный метр', price: '3 000,00 ₽', quantity: '12' },
  ])
})

test('notice xml becomes a short card and keeps the position count', () => {
  const card = readNoticeXml(NOTICE)
  expect(card.documentKind).toBe('epNotificationEF2020')
  expect(card.schemeVersion).toBe('16.3')
  expect(card.documentTitle).toBe('Услуги по обслуживанию зданий')
  expect(card.positionCount).toBe(2)
  expect(card.sections[0]?.fields).toEqual(expect.arrayContaining([
    { label: 'Номер', value: '0156100010726000075' },
    { label: 'Способ', value: 'Электронный аукцион' },
    { label: 'Начальная цена', value: '991 587,00 ₽' },
    { label: 'Опубликовано', value: '09.11.2026 19:19 (UTC+5)' },
  ]))
  expect(card.sections[1]?.fields.find((field) => field.label === 'Контакт')?.value).toBe('Иванова Мария')
  expect(card.blocks.map((block) => block.name)).toContain('commonInfo')
})

test('a saved notice is grouped into sections and a signature is left out', () => {
  const document = readNoticeDocument(
    NOTICE.replace(
      '</ns3:epNotificationEF2020>',
      '<signature>УНИКАЛЬНАЯПОДПИСЬ</signature></ns3:epNotificationEF2020>',
    ),
  )
  const fields = document.sections.flatMap((section) => section.fields)
  expect(document.sections.some((section) => section.title === 'Общие сведения')).toBe(true)
  expect(fields.some((field) => field.label === 'Номер' && field.value === '0156100010726000075')).toBe(true)
  expect(fields.some((field) => field.value.includes('УНИКАЛЬНАЯПОДПИСЬ'))).toBe(false)
})

test('a 223-FZ notice skips the header and keeps the files', () => {
  const document = readNoticeDocument(`<?xml version="1.0" encoding="UTF-8"?>
<purchaseNotice>
  <header><guid>SECRET-GUID</guid><createDateTime>2026-11-01T10:00:00</createDateTime></header>
  <body><item><purchaseNoticeData>
    <registrationNumber>32515573734</registrationNumber>
    <name>Вывоз отходов</name>
    <customer><mainInfo><fullName>Исследовательский центр</fullName><inn>5407073206</inn></mainInfo></customer>
    <attachments><document>
      <fileName>Проект.docx</fileName>
      <url>https://zakupki.gov.ru/file/1</url>
      <cryptoSigns><signature>УНИКАЛЬНАЯПОДПИСЬ</signature></cryptoSigns>
    </document></attachments>
    <lots><lot><lotData><subject>Отходы класса Б</subject><initialSum>700000</initialSum></lotData></lot></lots>
  </purchaseNoticeData></item></body>
</purchaseNotice>`)
  const fields = document.sections.flatMap((section) => section.fields)
  expect(document.sections.map((section) => section.title)).toEqual(['Общие сведения', 'Заказчик', 'Вложения', 'Лоты'])
  expect(fields.some((field) => field.value === 'SECRET-GUID')).toBe(false)
  expect(fields.some((field) => field.value.includes('УНИКАЛЬНАЯПОДПИСЬ'))).toBe(false)
  expect(fields).toEqual(expect.arrayContaining([
    { label: 'Номер', value: '32515573734' },
    { label: 'Организация', value: 'Исследовательский центр' },
    { label: 'Файл', value: 'Проект.docx\nhttps://zakupki.gov.ru/file/1' },
    { label: 'Предмет', value: 'Отходы класса Б' },
    { label: 'Начальная цена', value: '700 000,00 ₽' },
  ]))
})

test('zip reader accepts a deflated entry whose sizes live in the central directory', () => {
  const xml = '<root><name>архив</name></root>'
  const packed = deflateRawSync(Buffer.from(xml))
  const zip = zipDeflated(packed, Buffer.from(xml), 'notice.xml')
  expect(readZipXml(zip)).toEqual({ name: 'notice.xml', xml })
})

const NOTICE_WITH_FILES = `<?xml version="1.0" encoding="UTF-8"?>
<export>
  <epNotificationEF2020 schemeVersion="16.3">
    <commonInfo>
      <purchaseNumber>0156100010726000075</purchaseNumber>
      <purchaseObjectInfo>Услуги по обслуживанию зданий</purchaseObjectInfo>
    </commonInfo>
    <purchaseResponsibleInfo>
      <responsibleOrgInfo><fullName>СУ СК РОССИИ ПО ПЕРМСКОМУ КРАЮ</fullName></responsibleOrgInfo>
    </purchaseResponsibleInfo>
    <attachmentsInfo>
      <attachmentInfo>
        <fileName>Обоснование НМЦК.docx</fileName>
        <fileSize>20493</fileSize>
        <url>https://zakupki.gov.ru/44fz/filestore/public/1.0/download/priz/file.html?uid=file-1</url>
      </attachmentInfo>
      <attachmentInfo>
        <fileName>Проект контракта.docx</fileName>
        <fileSize>89076</fileSize>
        <url>https://zakupki.gov.ru/44fz/filestore/public/1.0/download/priz/file.html?uid=file-2</url>
      </attachmentInfo>
    </attachmentsInfo>
    <notificationInfo>
      <customerRequirementsInfo>
        <customerRequirementInfo>
          <customer><fullName>СЛЕДСТВЕННОЕ УПРАВЛЕНИЕ</fullName></customer>
          <applicationGuarantee><amount>9915.87</amount><part>1.0</part></applicationGuarantee>
          <contractGuarantee><part>10.0</part></contractGuarantee>
        </customerRequirementInfo>
      </customerRequirementsInfo>
      <purchaseObjectsInfo>
        <purchaseObject>
          <name>Прокладка трубы</name>
          <OKEI><nationalCode>пог. м</nationalCode></OKEI>
          <price>2500.00</price>
          <quantity><undefined>true</undefined></quantity>
        </purchaseObject>
        <purchaseObject>
          <name>Замена трубы</name>
          <OKEI><nationalCode>м[2*]</nationalCode><name>Квадратный метр</name></OKEI>
          <price>3000.00</price>
          <quantity><value>12</value></quantity>
        </purchaseObject>
      </purchaseObjectsInfo>
    </notificationInfo>
  </epNotificationEF2020>
</export>`

function zipDeflated(packed: Buffer, plain: Buffer, name: string) {
  const nameBytes = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0x8, 6)
  local.writeUInt16LE(8, 8)
  local.writeUInt16LE(nameBytes.length, 26)
  const descriptor = Buffer.alloc(16)
  descriptor.writeUInt32LE(0x08074b50, 0)
  descriptor.writeUInt32LE(packed.length, 8)
  descriptor.writeUInt32LE(plain.length, 12)
  const localPart = Buffer.concat([local, nameBytes, packed, descriptor])
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(0x8, 8)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(packed.length, 20)
  central.writeUInt32LE(plain.length, 24)
  central.writeUInt16LE(nameBytes.length, 28)
  central.writeUInt32LE(0, 42)
  const centralPart = Buffer.concat([central, nameBytes])
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(centralPart.length, 12)
  eocd.writeUInt32LE(localPart.length, 16)
  return Buffer.concat([localPart, centralPart, eocd])
}
