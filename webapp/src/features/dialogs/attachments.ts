import type { AttachmentAdapter, PendingAttachment } from '@assistant-ui/react'

import { CHAT_FILE_ACCEPT, fileToMealImage, isChatDocumentFile } from './composer/meal-image-pick'

const DOCUMENT_BYTES = 20 * 1024 * 1024

async function fileBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function compressedFile(name: string, mime: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  const nextName = /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, '.jpg') : `${name}.jpg`
  return new File([bytes], mime === 'image/jpeg' ? nextName : name, { type: mime })
}

/** Meal-sized photos: the same compression the diary composer uses before Nora sees them. */
export class NoraImageAttachmentAdapter implements AttachmentAdapter {
  accept = CHAT_FILE_ACCEPT

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    if (isChatDocumentFile(file)) {
      if (file.size === 0) throw new Error('Файл пустой')
      if (file.size > DOCUMENT_BYTES) throw new Error('Файл больше 20 МБ')
      const id = crypto.randomUUID()
      const data = await fileBase64(file)
      return {
        id,
        type: 'document',
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        file,
        status: { type: 'requires-action', reason: 'composer-send' },
        content: [{ type: 'file', data, mimeType: file.type || 'application/octet-stream', filename: file.name }],
      }
    }
    const image = await fileToMealImage(file)
    const id = crypto.randomUUID()
    return {
      id,
      type: 'image',
      name: file.name,
      contentType: image.mime,
      file: compressedFile(file.name, image.mime, image.base64),
      status: { type: 'requires-action', reason: 'composer-send' },
      content: [{ type: 'image', image: `data:${image.mime};base64,${image.base64}` }],
    }
  }

  async send(attachment: PendingAttachment) {
    const document = attachment.content?.find((part) => part.type === 'file')
    if (document?.type === 'file') {
      return {
        ...attachment,
        status: { type: 'complete' as const },
        content: [document],
      }
    }
    const image = attachment.content?.find((part) => part.type === 'image')
    if (!image || image.type !== 'image') throw new Error('Не удалось прочитать фото')
    return {
      ...attachment,
      status: { type: 'complete' as const },
      content: [image],
    }
  }

  async remove() {}
}
