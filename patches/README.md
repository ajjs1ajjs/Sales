# Patches (applied by `patch-package` on every `npm ci`)

## vite-plugin-pwa+1.3.0.patch

Forces the `injectManifest` service-worker build (`src/sw.ts`) into a single
self-contained `sw.js`: `codeSplitting: false`, and drops
`inlineDynamicImports`. Without it the SW build emits split chunks that the
workbox `injectManifest` step mishandles for this project setup.

Rules:

- **Do not bump `vite-plugin-pwa` casually.** The patch targets a hashed
  build artifact (`dist/vite-build-BGK4YAIU.js`) — ANY upstream bump renames
  it and fails `postinstall` everywhere (all three workflows run `npm ci`).
  The dependency is pinned to exactly `1.3.0` for this reason.
- **Bump procedure:** bump → `npx patch-package vite-plugin-pwa` to
  re-record → verify `npm run build` → offline smoke test
  (`dist/sw.js` must be a single file).
- If the build works without the patch after an upstream bump, delete it.
