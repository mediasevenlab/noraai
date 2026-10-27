declare module 'node-edge-tts/dist/drm.js' {
  export const CHROMIUM_FULL_VERSION: string
  export const SEC_MS_GEC_VERSION_V2: string
  export const TRUSTED_CLIENT_TOKEN: string
  export function generateSecMsGecToken_V2(unixSeconds?: number): string
}
