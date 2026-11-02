import sharp from 'sharp'

import { encodeJpeg } from './sharp-meal-image'

const SINGLE_EDGE = 448
const TILE_EDGE = 1600
const BAND = 960
const OVERLAP = 80
const MAX_TILES = 8
/** A page that is much taller or wider than a photo is read in bands, not squeezed into one square. */
const STRIP = 2.2

function bandStarts(length: number) {
  const span = Math.min(BAND, length)
  const step = Math.max(1, span - OVERLAP)
  const starts: number[] = []
  for (let start = 0; start < length && starts.length < MAX_TILES; start += step) {
    const offset = Math.min(start, Math.max(0, length - span))
    const previous = starts.at(-1)
    if (previous != null && offset <= previous) break
    starts.push(offset)
    if (offset + span >= length) break
  }
  return starts
}

/** A photo stays one small frame. A long screenshot is cut into bands that keep its short side. */
export async function chatVisionTiles(bytes: Buffer): Promise<Buffer[]> {
  const meta = await sharp(bytes, { failOn: 'none' }).rotate().metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width < 2 || height < 2) return [bytes]
  const long = Math.max(width, height)
  const short = Math.min(width, height)
  if (long / short < STRIP) {
    return [await encodeJpeg(bytes, { maxEdge: long > 1600 ? TILE_EDGE : SINGLE_EDGE, quality: long > 1600 ? 80 : 72 })]
  }
  const scale = short > TILE_EDGE ? TILE_EDGE / short : 1
  const scaledLong = Math.round(long * scale)
  // A wide table stays one picture. A left/right cut becomes two tables and the columns slide.
  const fittedShort = Math.round(short * (TILE_EDGE / long))
  if (scaledLong <= TILE_EDGE || (width > height && fittedShort >= 280)) {
    return [await encodeJpeg(bytes, { maxEdge: TILE_EDGE, quality: 80 })]
  }
  const scaledW = Math.max(1, Math.round(width * scale))
  const scaledH = Math.max(1, Math.round(height * scale))
  const scaled = await sharp(bytes)
    .rotate()
    .resize(scaledW, scaledH, { fit: 'fill', withoutEnlargement: true })
    .toBuffer()
  const vertical = scaledH >= scaledW
  const length = vertical ? scaledH : scaledW
  const cross = vertical ? scaledW : scaledH
  const tiles: Buffer[] = []
  for (const offset of bandStarts(length)) {
    const span = Math.min(BAND, length - offset)
    const tile = sharp(scaled).extract(
      vertical
        ? { left: 0, top: offset, width: cross, height: span }
        : { left: offset, top: 0, width: span, height: cross },
    )
    tiles.push(await tile.jpeg({ quality: 82, mozjpeg: true }).toBuffer())
  }
  return tiles.length > 0 ? tiles : [await encodeJpeg(bytes, { maxEdge: TILE_EDGE, quality: 80 })]
}
