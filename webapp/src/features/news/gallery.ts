export type NewsGalleryMedia = {
  kind: 'image' | 'video'
  url: string
  role?: 'poster'
}

export type NewsSlide = {
  kind: 'image' | 'video'
  url: string
  poster?: string
}

/** Gallery order for the open post. A video preview is the player's poster, not its own slide. */
export function newsSlides(media: readonly NewsGalleryMedia[]): NewsSlide[] {
  const poster = media.find((item) => item.kind === 'image' && item.role === 'poster')?.url
  const slides: NewsSlide[] = []
  for (const item of media) {
    if (item.role === 'poster') continue
    if (item.kind === 'video') {
      slides.push(poster ? { kind: 'video', url: item.url, poster } : { kind: 'video', url: item.url })
      continue
    }
    if (item.kind === 'image') slides.push({ kind: 'image', url: item.url })
  }
  if (slides.length === 0 && poster) slides.push({ kind: 'image', url: poster })
  return slides
}

/** Card cover shows photos. A lone video keeps its preview as the still cover. */
export function newsCoverUrls(media: readonly NewsGalleryMedia[]): string[] {
  const images = newsSlides(media)
    .filter((item) => item.kind === 'image')
    .map((item) => item.url)
  if (images.length > 0) return images
  const poster = media.find((item) => item.kind === 'image')?.url
  return poster ? [poster] : []
}
