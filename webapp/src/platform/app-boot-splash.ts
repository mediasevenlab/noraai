import { useLayoutEffect } from 'react'

export function dismissAppBootSplash(
  doc: { getElementById(id: string): { setAttribute(name: string, value: string): void } | null } = document,
) {
  doc.getElementById('app-boot')?.setAttribute('hidden', '')
}

export function useDismissAppBootSplash() {
  useLayoutEffect(() => {
    dismissAppBootSplash()
  }, [])
}
