import { expect, test } from 'bun:test'

import {
  acceptedMeetingAudio,
  chosenMeetingTitle,
  cleanMeetingTitle,
  estimateMeetingEta,
  formatMeetingTranscript,
  meetingChatContext,
  meetingSpeakerCount,
  meetingTitle,
  normalizeMeetingSegments,
  parseMeetingJob,
  parseMeetingJobId,
  renameMeetingSpeaker,
} from './transcript'

test('meeting transcript keeps speaker labels and the clock from the example', () => {
  expect(
    formatMeetingTranscript([
      { speaker: 'Спикер 1', start: 72, end: 80, text: 'Начинаем планёрку.' },
      { speaker: 'Спикер 2', start: 78, end: 90, text: 'Бюджет уже сверстали.' },
    ]),
  ).toBe(
    ['[00:01:12] Спикер 1: Начинаем планёрку.', '[00:01:18] Спикер 2: Бюджет уже сверстали.'].join('\n'),
  )
})

test('speaker ids from the diarizer become stable labels for one recording', () => {
  expect(
    normalizeMeetingSegments([
      { speaker: 'SPEAKER_01', start: 10, end: 12, text: 'Второй начал.' },
      { speaker: 'SPEAKER_00', start: 12, end: 14, text: 'Первый ответил.' },
      { speaker: 'SPEAKER_01', start: 14, end: 16, text: 'И продолжил.' },
    ]),
  ).toEqual([
    { speaker: 'Спикер 1', start: 10, end: 12, text: 'Второй начал.' },
    { speaker: 'Спикер 2', start: 12, end: 14, text: 'Первый ответил.' },
    { speaker: 'Спикер 1', start: 14, end: 16, text: 'И продолжил.' },
  ])
})

test('a finished job without a transcript is still readable text', () => {
  const job = parseMeetingJob({
    status: 'completed',
    turns: [{ label: 'A', start: 0, end: 3, text: 'Алло' }],
  })
  expect(job.status).toBe('ready')
  expect(job.transcript).toBe('[00:00:00] Спикер 1: Алло')
  expect(job.progress).toBe(100)
  expect(parseMeetingJobId({ job_id: 'job-1' })).toBe('job-1')
})

test('a running job keeps the stage, percent, and remaining time', () => {
  const job = parseMeetingJob({
    status: 'running',
    stage: 'transcribing',
    progress: 42.4,
    etaSeconds: 95,
  })
  expect(job.stage).toBe('transcribing')
  expect(job.progress).toBe(42)
  expect(job.etaSeconds).toBe(95)
  expect(job.steps.find((step) => step.id === 'transcribing')?.state).toBe('current')
  expect(parseMeetingJob({ status: 'queued' }).etaSeconds).toBeNull()
  expect(parseMeetingJob({ status: 'running', stage: 'diarizing' }).etaSeconds).toBeNull()
})

test('remaining time is estimated from the recording length before the real pace is known', () => {
  expect(
    estimateMeetingEta({
      stage: 'diarizing',
      audioSeconds: 100,
      stageStartedAt: 1000,
      audioDone: 0,
      nowSeconds: 1040,
    }),
  ).toBe(4)
  expect(
    estimateMeetingEta({
      stage: 'transcribing',
      audioSeconds: 100,
      stageStartedAt: 2000,
      audioDone: 40,
      nowSeconds: 2010,
    }),
  ).toBe(15)
  const fresh = Date.now() / 1000
  const job = parseMeetingJob({
    status: 'running',
    stage: 'diarizing',
    etaSeconds: 999,
    audioSeconds: 100,
    stageStartedAt: fresh - 40,
    audioDone: 0,
  })
  expect(job.etaSeconds).toBeGreaterThan(1)
  expect(job.etaSeconds).toBeLessThan(15)
})

test('a chosen speaker name stays in the transcript', () => {
  expect(
    normalizeMeetingSegments([
      { speaker: 'Сурдин', start: 0, end: 4, text: 'До сих пор много людей так думают.' },
      { speaker: 'SPEAKER_02', start: 4, end: 8, text: 'Дальше отвечает второй.' },
    ]),
  ).toEqual([
    { speaker: 'Сурдин', start: 0, end: 4, text: 'До сих пор много людей так думают.' },
    { speaker: 'Спикер 1', start: 4, end: 8, text: 'Дальше отвечает второй.' },
  ])
})

test('renaming a speaker replaces that voice in every line', () => {
  const renamed = renameMeetingSpeaker(
    [
      { speaker: 'Спикер 1', start: 0, end: 4, text: 'Первая фраза.' },
      { speaker: 'Спикер 2', start: 4, end: 9, text: 'Ответ.' },
      { speaker: 'Спикер 1', start: 9, end: 12, text: 'И снова первый.' },
    ],
    'Спикер 1',
    'Сурдин',
  )
  expect(renamed.map((segment) => segment.speaker)).toEqual(['Сурдин', 'Спикер 2', 'Сурдин'])
  expect(formatMeetingTranscript(renamed)).toContain('[00:00:09] Сурдин: И снова первый.')
  expect(() => renameMeetingSpeaker(renamed, 'Спикер 3', 'Гость')).toThrow('нет')
})

test('audio names and an optional speaker count are checked before the queue', () => {
  expect(acceptedMeetingAudio('план.m4a', '')).toBe(true)
  expect(acceptedMeetingAudio('заметка.txt', 'text/plain')).toBe(false)
  expect(acceptedMeetingAudio('voice', 'audio/webm')).toBe(true)
  expect(meetingTitle('C:\\Записи\\Планёрка марта.mp3')).toBe('Планёрка марта')
  expect(chosenMeetingTitle('  Собрание отдела  ', 'Планёрка.mp3')).toBe('Собрание отдела')
  expect(chosenMeetingTitle('', 'Планёрка.mp3')).toBe('Планёрка')
  expect(chosenMeetingTitle('Новая встреча', 'Планёрка.mp3')).toBe('Планёрка')
  expect(chosenMeetingTitle(undefined, 'Планёрка.mp3')).toBe('Планёрка')
  expect(() => chosenMeetingTitle('я'.repeat(121), 'Планёрка.mp3')).toThrow('Название')
  expect(meetingSpeakerCount('')).toBeNull()
  expect(meetingSpeakerCount('3')).toBe(3)
  expect(() => meetingSpeakerCount('0')).toThrow('Число спикеров')
  expect(cleanMeetingTitle('  Планёрка   марта  ')).toBe('Планёрка марта')
  expect(() => cleanMeetingTitle('   ')).toThrow('Название')
})

test('a chat question keeps every speaker line from the selected meeting', () => {
  const meetings = [
    {
      title: 'Сурдин',
      segments: [
        { speaker: 'Спикер 1', start: 20, end: 40, text: 'Владимир Сурдин, астроном.' },
        { speaker: 'Спикер 2', start: 41, end: 70, text: 'Нужно обязательно поговорить про космонавтов.' },
      ],
    },
  ]
  const matched = meetingChatContext(meetings, 'Что сказали про космонавтов?')
  expect(matched).toContain('Расшифровки выбранных встреч.')
  expect(matched).toContain('Спикер 1:\nВладимир Сурдин, астроном.')
  expect(matched).toContain('Спикер 2:\nНужно обязательно поговорить про космонавтов.')
  const opening = meetingChatContext(meetings, 'О чём это?')
  expect(opening).toContain('астроном')
  expect(opening).toContain('Голоса: Спикер 1, Спикер 2')
  const about = meetingChatContext(
    [
      {
        title: 'Сурдин',
        segments: [
          ...meetings[0]!.segments,
          { speaker: 'Спикер 2', start: 80, end: 90, text: 'Вот этот телескоп стоит в горах.' },
        ],
      },
    ],
    'О чем этот текст?',
  )
  expect(about).toContain('астроном')
  expect(about).toContain('Спикер 2:\nНужно обязательно поговорить про космонавтов.\nВот этот телескоп стоит в горах.')
  expect(meetingChatContext([{ title: 'Пусто', segments: [] }], 'космонавтов')).toContain('ещё нет текста')
  const named = meetingChatContext(
    [
      {
        title: 'Планёрка',
        segments: [
          { speaker: 'Михаил', start: 0, end: 2, text: 'Начнём с навески.' },
          { speaker: 'Спикер 2', start: 3, end: 5, text: 'Линий шесть.' },
        ],
      },
    ],
    'кто говорил',
  )
  expect(named).toContain('Михаил:\nНачнём с навески.')
  expect(named).toContain('Спикер 2:\nЛиний шесть.')
})
