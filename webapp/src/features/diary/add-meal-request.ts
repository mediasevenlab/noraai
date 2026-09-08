let opener: (() => void) | null = null
let pending = false

export const DIARY_MOBILE_DOCK_MOVE_ID = 'diary-mobile-dock-move'

/** Diary page registers the add-meal dialog; mobile menu (or other chrome) can request it. */
export function registerAddMealOpener(open: () => void) {
  opener = open
  if (pending) {
    pending = false
    open()
  }
  return () => {
    if (opener === open) opener = null
  }
}

/** Opens the add-meal dialog if the diary is mounted; otherwise queues until it is. */
export function requestAddMeal() {
  if (opener) {
    opener()
    return true
  }
  pending = true
  return false
}

export function resetAddMealRequestForTests() {
  opener = null
  pending = false
}
