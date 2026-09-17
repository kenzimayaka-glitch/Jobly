# JOBLY — TRUE VIDEO PITCH ENGINE V23

## Objectif
Remplacer le média vidéo de démonstration du redesign Cinematic par un vrai pitch vidéo appartenant au Talent et visible par le Recruiter.

## Flux livré
1. Talent ouvre `TALENT / VIDEO PITCH` depuis `/talent/profile`.
2. Le Talent peut enregistrer une prise caméra + micro ou importer une vidéo.
3. Validation navigateur : 5 à 8 secondes, formats MP4/WebM/MOV, 25 Mo max.
4. Upload serveur via `/api/auth/video-pitch` vers Supabase Storage (`talent-pitches`).
5. `User.pitchVideoUrl`, `pitchVideoStoragePath`, `pitchVideoDurationMs`, `pitchVideoUpdatedAt` sont persistés.
6. Le flux Recruiter `/api/recruiter/applications` expose `pitchVideoUrl` et sa durée.
7. Le Match Lab lit le vrai pitch en autoplay muted, avec play/pause et haptics.
8. Le profil partagé `/talent/profile?candidate=...` lit le vrai pitch ; aucune vidéo de démonstration n'est présentée comme étant celle d'un candidat.
9. Le Talent peut remplacer ou supprimer son pitch.

## Migration Supabase
`supabase/20260916090000_talent_pitch.sql`

## Fichiers principaux
- `app/api/auth/video-pitch/route.ts`
- `app/api/profile/route.ts`
- `app/api/recruiter/applications/route.ts`
- `components/JoblyCinematic.tsx`
- `packages/database/prisma/schema.prisma`
- `supabase/PROFILE-FOUNDATION.sql`

## Limitation volontaire
La durée est validée côté navigateur puis transmise au serveur. Le serveur impose également 5–8 secondes, mais ne transcode pas la vidéo. Une étape future pourra ajouter un contrôle média serveur/FFmpeg si nécessaire.

## À tester E2E
- permission caméra/micro sur mobile
- enregistrement 5–8 s
- rejet <5 s et >8 s
- import MP4/WebM/MOV
- upload Supabase et lecture publique
- remplacement + suppression
- Recruiter voit le vrai pitch
- aucune URL `ambient-loop.mp4` utilisée comme pitch candidat
- Vercel build/typecheck
