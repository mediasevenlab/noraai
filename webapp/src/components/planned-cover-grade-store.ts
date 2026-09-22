import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  applyPlannedCoverGradeToDocument,
  DEFAULT_PLANNED_COVER_GRADE,
  PLANNED_COVER_GRADE_STORAGE_KEY,
  parsePlannedCoverGrade,
  type PlannedCoverGrade,
} from './planned-cover-grade'

function readStoredPlannedCoverGrade(): PlannedCoverGrade {
  if (typeof window === 'undefined') return DEFAULT_PLANNED_COVER_GRADE
  return parsePlannedCoverGrade(window.localStorage.getItem(PLANNED_COVER_GRADE_STORAGE_KEY))
}

let plannedCoverGradeSnapshot = DEFAULT_PLANNED_COVER_GRADE
const plannedCoverGradeListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  plannedCoverGradeSnapshot = readStoredPlannedCoverGrade()
  applyPlannedCoverGradeToDocument(plannedCoverGradeSnapshot)
}

function emitPlannedCoverGrade() {
  for (const listener of plannedCoverGradeListeners) listener()
}

function subscribePlannedCoverGrade(listener: () => void) {
  plannedCoverGradeListeners.add(listener)
  return () => {
    plannedCoverGradeListeners.delete(listener)
  }
}

export function setPlannedCoverGrade(grade: PlannedCoverGrade) {
  const next = parsePlannedCoverGrade(JSON.stringify(grade))
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PLANNED_COVER_GRADE_STORAGE_KEY, JSON.stringify(next))
  }
  applyPlannedCoverGradeToDocument(next)
  plannedCoverGradeSnapshot = next
  emitPlannedCoverGrade()
}

export function usePlannedCoverGrade() {
  return useSyncExternalStore(
    subscribePlannedCoverGrade,
    () => plannedCoverGradeSnapshot,
    () => DEFAULT_PLANNED_COVER_GRADE,
  )
}

/** Keep the temporary black-and-white grade filter in the document. */
export function PlannedCoverGradeSync() {
  const grade = usePlannedCoverGrade()

  useLayoutEffect(() => {
    applyPlannedCoverGradeToDocument(grade)
  }, [grade])

  return null
}
