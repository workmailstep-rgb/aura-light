# 3D and Liquid Logo sources

The AURA scene uses React 19.3.1, React DOM 19.3.1, Three.js 0.187.0 and
`@react-three/fiber` 9.8.2 (MIT). Exact package integrity hashes are recorded in
`package-lock.json`. The build emits runtime dependency notices in
`dist/assets/experience/THIRD_PARTY.txt`.

The liquid-metal fragment in `src/vendor/liquid-frag.js` is the original source
from [paper-design/liquid-logo](https://github.com/paper-design/liquid-logo),
commit `689bb38a1e0d5a6a8baf2d34847635eefde19994`, path
`src/app/hero/liquid-frag.ts`, Git blob `89567153f92d205abced9453a3593afffe4c9316`.
`src/liquid-shader.js` adapts its palette to AURA; `tools/make-liquid-mask.py`
adapts the logo bevel preprocessing from `src/hero/parse-logo-image.ts` at that
same commit. The source license is [PolyForm Shield 1.0.0](liquid-logo-LICENSE.md),
which includes a noncompete restriction. These portions are not MIT-licensed.
AURA uses them as an end-product brand effect, not as a logo or shader editor.

No Paper Design example trademarks, image-upload service, analytics, Vercel Blob
integration, Next.js application or development hooks are included.
