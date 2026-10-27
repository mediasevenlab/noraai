/** One short request. A long recording dies on a lossy link; a few megabytes get through. */
export const meetingPartBytes = 4 * 1024 * 1024

export const maxMeetingAudioBytes = 256 * 1024 * 1024

const uploadIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertMeetingUploadId(value: string) {
  if (!uploadIdPattern.test(value)) throw new Error('Загрузка не найдена')
}

export function meetingPartCount(fileSize: number, partBytes = meetingPartBytes) {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > maxMeetingAudioBytes) {
    throw new Error(fileSize > maxMeetingAudioBytes ? 'Файл больше 256 МБ' : 'Файл пустой')
  }
  if (!Number.isSafeInteger(partBytes) || partBytes <= 0) throw new Error('Не удалось принять часть записи')
  return Math.ceil(fileSize / partBytes)
}

export function expectedMeetingPartLength(
  fileSize: number,
  index: number,
  count: number,
  partBytes = meetingPartBytes,
) {
  const expectedCount = meetingPartCount(fileSize, partBytes)
  if (!Number.isSafeInteger(count) || count !== expectedCount) {
    throw new Error('Число частей не сходится с размером файла')
  }
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
    throw new Error('Нет такой части записи')
  }
  const start = index * partBytes
  return Math.min(partBytes, fileSize - start)
}
