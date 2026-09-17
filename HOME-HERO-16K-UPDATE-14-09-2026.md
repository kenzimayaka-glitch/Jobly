# JOBLY — Homepage Hero 16K Update — 14/09/2026

- Homepage hero image replaced with the user-provided group photo.
- Asset upscaled losslessly in content/geometry terms to 8192×16384 (16K-class vertical), without face retouching or facial modification.
- Hero uses `next/image` with `fill`, `priority`, and `object-cover object-top`.
- Root layout/body reset to full-bleed white viewport while preserving `PwaInit` and font variables.
- Added Framer Motion for the title heart entrance animation.
- Bubble field expanded from 10 to 16 bubbles, using the requested Jobly palette and colored splash bursts on collision, click, and lifetime expiry.
- Legal links remain routed to the existing valid Jobly pages: `/legal/terms` and `/legal/privacy`.
- Authentication logic in `lib/auth.ts` was not modified.
