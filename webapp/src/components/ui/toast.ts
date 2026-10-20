import { createElement } from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from '@/components/icons'

const toastIcons = {
  info: createElement(InfoIcon, { className: 'size-4' }),
  success: createElement(CircleCheckIcon, { className: 'size-4' }),
  warning: createElement(TriangleAlertIcon, { className: 'size-4' }),
  error: createElement(OctagonXIcon, { className: 'size-4' }),
  loading: createElement(Loader2Icon, { className: 'size-4 animate-spin' }),
}

function withIcon(kind: keyof typeof toastIcons, data?: ExternalToast): ExternalToast {
  if (data?.icon !== undefined) return data
  return { ...data, icon: toastIcons[kind] }
}

function toast(message: Parameters<typeof sonnerToast>[0], data?: ExternalToast) {
  return sonnerToast(message, withIcon('info', data))
}

toast.success = (
  message: Parameters<typeof sonnerToast.success>[0],
  data?: ExternalToast,
) => sonnerToast.success(message, withIcon('success', data))

toast.info = (
  message: Parameters<typeof sonnerToast.info>[0],
  data?: ExternalToast,
) => sonnerToast.info(message, withIcon('info', data))

toast.warning = (
  message: Parameters<typeof sonnerToast.warning>[0],
  data?: ExternalToast,
) => sonnerToast.warning(message, withIcon('warning', data))

toast.error = (
  message: Parameters<typeof sonnerToast.error>[0],
  data?: ExternalToast,
) => sonnerToast.error(message, withIcon('error', data))

toast.loading = (
  message: Parameters<typeof sonnerToast.loading>[0],
  data?: ExternalToast,
) => sonnerToast.loading(message, withIcon('loading', data))

toast.message = (
  message: Parameters<typeof sonnerToast.message>[0],
  data?: ExternalToast,
) => sonnerToast.message(message, withIcon('info', data))

toast.promise = sonnerToast.promise
toast.custom = sonnerToast.custom
toast.dismiss = sonnerToast.dismiss
toast.getHistory = sonnerToast.getHistory
toast.getToasts = sonnerToast.getToasts

export { toast }
