import { z } from 'zod'

export const meetingStatusSchema = z.enum(['queued', 'running', 'ready', 'failed'])

export const meetingSegmentSchema = z
  .object({
    speaker: z.string(),
    start: z.number(),
    end: z.number(),
    text: z.string(),
  })
  .strict()

export const meetingSummarySchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    fileName: z.string(),
    status: meetingStatusSchema,
    speakers: z.number().int().nullable(),
    stage: z.string(),
    progress: z.number().int().min(0).max(100),
    etaSeconds: z.number().int().min(0).nullable(),
    error: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export const meetingStepSchema = z
  .object({
    id: z.string().min(1).max(40),
    state: z.enum(['pending', 'current', 'done']),
    seconds: z.number().int().min(0).nullable(),
  })
  .strict()

export const meetingSchema = meetingSummarySchema
  .extend({
    transcript: z.string(),
    segments: z.array(meetingSegmentSchema),
    elapsedSeconds: z.number().int().min(0).nullable(),
    steps: z.array(meetingStepSchema),
    hasAudio: z.boolean(),
  })
  .strict()

export const renameMeetingSpeakerSchema = z
  .object({
    from: z.string().trim().min(1).max(40),
    to: z.string().trim().min(1).max(40),
  })
  .strict()

export const renameMeetingTitleSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
  })
  .strict()

export const meetingListSchema = z
  .object({
    meetings: z.array(meetingSummarySchema),
  })
  .strict()

export const deleteMeetingResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()

export type MeetingStatus = z.infer<typeof meetingStatusSchema>
export type MeetingSegment = z.infer<typeof meetingSegmentSchema>
export type MeetingStep = z.infer<typeof meetingStepSchema>
export type MeetingSummary = z.infer<typeof meetingSummarySchema>
export type Meeting = z.infer<typeof meetingSchema>
export type MeetingList = z.infer<typeof meetingListSchema>
export type RenameMeetingSpeaker = z.infer<typeof renameMeetingSpeakerSchema>
export type RenameMeetingTitle = z.infer<typeof renameMeetingTitleSchema>
