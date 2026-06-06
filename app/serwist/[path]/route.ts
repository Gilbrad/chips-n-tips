import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'

const gitRevision = spawnSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf-8',
}).stdout.trim()
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA || gitRevision || process.env.npm_package_version

const offlineRoutes = [
  '/',
  '/~offline',
  '/calendar',
  '/categories',
  '/currency',
  '/login',
  '/signup',
]

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: offlineRoutes.map((url) => ({
      revision,
      url,
    })),
    swSrc: 'app/sw.ts',
    useNativeEsbuild: true,
  })
