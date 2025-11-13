import { constants, promises as fs } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'

const IMAGE_DIR = path.resolve(process.cwd(), 'src', 'upload', 'stationimage')
const IMAGE_URL_PREFIX = '/station-images'
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const ensureDirReady = (() => {
  let ready = false
  return async () => {
    if (ready) return
    await fs.mkdir(IMAGE_DIR, { recursive: true })
    ready = true
  }
})()

const sanitizeStationId = (stationId: string) => {
  const trimmed = stationId.trim()
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!sanitized.length) {
    throw new Error('Invalid station ID for file naming')
  }
  return sanitized
}

const getExtensionFromMime = (mime: string) => {
  return ALLOWED_IMAGE_TYPES[mime]
}

const buildFilename = (stationId: string, extension: string) =>
  `${sanitizeStationId(stationId)}${extension}`

export const resolveStationImagePath = (filename: string) =>
  path.join(IMAGE_DIR, filename)

export const getStationImageFilenameFromUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null
  if (!imageUrl.startsWith(IMAGE_URL_PREFIX + '/')) {
    return null
  }
  return imageUrl.slice(IMAGE_URL_PREFIX.length + 1)
}

export const saveStationImage = async (stationId: string, file: File) => {
  await ensureDirReady()

  if (!(file instanceof File)) {
    throw new Error('Invalid file payload')
  }

  if (!file.type || !getExtensionFromMime(file.type)) {
    throw new Error('Unsupported image type. Use JPEG, PNG or WebP.')
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5MB or smaller')
  }

  const extension = getExtensionFromMime(file.type)!
  const filename = buildFilename(stationId, extension)
  const filePath = resolveStationImagePath(filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return {
    filename,
    url: `${IMAGE_URL_PREFIX}/${filename}`,
    path: filePath
  }
}

export const deleteStationImageFile = async (filename: string) => {
  if (!filename) return
  const filePath = resolveStationImagePath(filename)
  try {
    await fs.rm(filePath)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }
}

export const stationImageExists = async (filename: string) => {
  try {
    await access(resolveStationImagePath(filename), constants.R_OK)
    return true
  } catch {
    return false
  }
}

export const getImageUrlForFilename = (filename: string | null) =>
  filename ? `${IMAGE_URL_PREFIX}/${filename}` : null

export const getMimeFromFilename = (filename: string) => {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'application/octet-stream'
}

export const imageUrlPrefix = IMAGE_URL_PREFIX
export const stationImageDirectory = IMAGE_DIR
