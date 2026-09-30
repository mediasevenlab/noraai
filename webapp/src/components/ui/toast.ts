import { createElement } from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'

import { InfoIcon } from '@/components/icons'

const neutralIcon = createElement(InfoIcon, { className: 'size-4' })

function withNeutralIcon(data?: ExternalToast): ExternalToast {
  if (data && data.icon !== undefined) return data
  return { ...data, icon: neutralIcon }
}

function toast(message: Parameters<typeof sonnerToast>[0], data?: ExternalToast) {
  return sonnerToast(message, withNeutralIcon(data))
}

toast.success = sonnerToast.success
toast.info = sonnerToast.info
toast.warning = sonnerToast.warning
toast.error = sonnerToast.error
toast.loading = sonnerToast.loading
toast.promise = sonnerToast.promise
toast.custom = sonnerToast.custom
toast.dismiss = sonnerToast.dismiss
toast.getHistory = sonnerToast.getHistory
toast.getToasts = sonnerToast.getToasts
toast.message = (
  message: Parameters<typeof sonnerToast.message>[0],
  data?: ExternalToast,
) => sonnerToast.message(message, withNeutralIcon(data))

export { toast }
