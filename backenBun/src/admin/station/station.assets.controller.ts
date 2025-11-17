import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { Elysia } from 'elysia'
import { getMimeFromFilename, resolveStationImagePath } from '../../lib/station-images'

declare const Bun: {
  file: (path: string) => Blob;
};

export const stationAssetsController = () =>
  new Elysia({ name: 'station-assets-controller' }).get(
    '/station-images/:filename',
    async ({ params, set }) => {
      const { filename } = params as { filename?: string }

      if (!filename || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
        set.status = 400
        return {
          success: false,
          message: 'Invalid image filename'
        }
      }

      const filePath = resolveStationImagePath(filename)
      console.log('[StationAssets] serving request', { filename, filePath })
      try {
        await access(filePath, constants.R_OK)
        const file = Bun.file(filePath)
        return new Response(file, {
          headers: {
            'Content-Type': getMimeFromFilename(filename),
            'Cache-Control': 'public, max-age=3600'
          }
        })
      } catch {
        set.status = 404
        return {
          success: false,
          message: 'Image not found'
        }
      }
    }
  )
