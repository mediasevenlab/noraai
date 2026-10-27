export type SpeechSpeaker = {
  speak(text: string, signal?: AbortSignal): Promise<Uint8Array>
}
