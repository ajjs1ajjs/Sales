# Patches (applied by `patch-package` on every `npm ci`)

No active patches.

## History: vite-plugin-pwa+1.3.0.patch (REMOVED 2026-10-07)

Forced the `injectManifest` SW build into a single `sw.js` by patching a
hashed plugin artifact (`dist/vite-build-BGK4YAIU.js`) — any upstream bump
renamed it and broke `npm ci` everywhere.

Replaced natively: `vite.config.ts` → `VitePWA({ injectManifest: {
rollupFormat: 'iife' } })` produces the exact same single-file output
(the `iife` branch in the plugin sets `codeSplitting: false` and drops
`inlineDynamicImports` itself). Verify after any plugin bump:
`npm run build` → `dist/sw.js` must be a single file.
