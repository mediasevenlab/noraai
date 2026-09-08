import * as React from 'react'

/** Keep a mutable ref aligned with the latest value after layout, never during render. */
export function useLatest<T>(value: T) {
  const ref = React.useRef(value)
  React.useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
