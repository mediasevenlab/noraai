import { afterEach, describe, expect, test } from 'bun:test'

import {
  authDemoCatchup,
  authDemoClear,
  authDemoElapsedMs,
  authDemoGeneration,
  authDemoIsPaused,
  authDemoIsRemountHold,
  authDemoIsSeeking,
  authDemoPlayFrom,
  authDemoReleaseSeek,
  authDemoResume,
  authDemoResetClock,
  authDemoSetPaused,
  authDemoStep,
  authDemoTimeout,
} from './auth-demo-playback'

afterEach(() => {
  authDemoResetClock()
})

function finishSeek() {
  let guard = 0
  while (authDemoCatchup() && guard < 500) guard += 1
  return guard
}

describe('auth demo playback clock', () => {
  test('playFrom remounts, catchup lands on the step, then stays paused', () => {
    const first: string[] = []
    authDemoPlayFrom(80)
    authDemoTimeout(() => first.push('a'), 80)
    finishSeek()
    expect(first).toEqual(['a'])
    expect(authDemoElapsedMs()).toBe(80)
    expect(authDemoIsPaused()).toBe(true)
    expect(authDemoIsRemountHold()).toBe(false)
    expect(authDemoIsSeeking()).toBe(true)
    expect(authDemoGeneration()).toBe(1)
    authDemoReleaseSeek()
    expect(authDemoIsSeeking()).toBe(false)
    authDemoResume()
    expect(authDemoIsPaused()).toBe(false)
  })

  test('playFrom again remounts from zero so the step can replay', () => {
    authDemoPlayFrom(80)
    authDemoTimeout(() => undefined, 80)
    finishSeek()
    expect(authDemoGeneration()).toBe(1)

    expect(authDemoPlayFrom(40)).toBeUndefined()
    expect(authDemoGeneration()).toBe(2)
    expect(authDemoElapsedMs()).toBe(0)
    expect(authDemoIsRemountHold()).toBe(true)

    const fired: string[] = []
    authDemoTimeout(() => fired.push('early'), 20)
    authDemoTimeout(() => fired.push('late'), 90)
    finishSeek()
    expect(fired).toEqual(['early'])
    expect(authDemoElapsedMs()).toBe(40)
    expect(authDemoIsPaused()).toBe(true)
  })

  test('empty catchup waves do not land before the step is ready', () => {
    authDemoPlayFrom(80)
    expect(authDemoCatchup()).toBe(true)
    expect(authDemoIsRemountHold()).toBe(true)
    expect(authDemoElapsedMs()).toBe(0)
    expect(authDemoIsPaused()).toBe(true)
  })

  test('cleared timeouts do not fire during playFrom', () => {
    const fired: string[] = []
    const id = authDemoTimeout(() => fired.push('nope'), 50)
    authDemoClear(id)
    authDemoPlayFrom(80)
    finishSeek()
    expect(fired).toEqual([])
  })

  test('pause keeps the clock usable', () => {
    authDemoSetPaused(true)
    expect(authDemoIsPaused()).toBe(true)
  })

  test('a long hidden gap does not skip the next demo step', () => {
    const fired: string[] = []
    authDemoTimeout(() => fired.push('soon'), 200)
    authDemoStep(1_000)
    authDemoStep(1_000 + 30_000)
    expect(fired).toEqual([])
    expect(authDemoElapsedMs()).toBeLessThan(200)
    authDemoStep(31_000 + 150)
    expect(fired).toEqual(['soon'])
  })

  test('playFrom autoplay resumes after the seek is released', () => {
    authDemoPlayFrom(80, { autoplay: true })
    authDemoTimeout(() => undefined, 80)
    finishSeek()
    expect(authDemoIsPaused()).toBe(true)
    expect(authDemoIsSeeking()).toBe(true)
    authDemoReleaseSeek()
    expect(authDemoIsSeeking()).toBe(false)
    expect(authDemoIsPaused()).toBe(false)
  })
})
