# Sound Audit and Requirements

## Existing files found
- article_open.wav — 0.42 s
- bookmark_saved.wav — 0.76 s
- download_complete.wav — 1.56 s
- error.wav — 0.52 s
- loading_start.wav — 0.04 s
- magic.wav — 1.94 s
- newbacksound.mp3 — 1.03 s
- newconfirm.mp3 — 0.96 s
- newconfirmsound.mp3 — 1.03 s
- newselectsound.mp3 — 0.50 s
- offline.wav — 0.18 s
- picker_tick.wav — 0.03 s
- podcast_play.wav / podcast_pause.wav — 0.38 s each
- refresh.wav — 4.47 s
- screen_close.wav — 1.97 s
- search_complete.wav — 4.21 s
- success.wav — 1.43 s
- sync_complete.wav — 1.86 s
- tab_change.wav — 0.24 s
- tip_popup.wav — 1.02 s
- welcome.wav — 1.99 s
- older back/confirm/select WAV variants also exist.

## Critical code issue
`src/context/SoundContext.tsx` references missing `sounds/xxx/picker-change.wav` for `unsave` and `session`. Replace with intentional files or remove those events.

## Current policy issue
`confirm`, `select`, `back`, and `magic` are configured to always play even when sound effects are disabled. This contradicts user control and should be removed. All optional UI sounds must honor the Gazette Sounds preference and appropriate system behavior.

## Recommended final sound vocabulary
1. **Page/Open Story** — soft paper movement, 150–450 ms.
2. **Save to Library** — gentle paper placed on shelf, 300–700 ms.
3. **Remove from Library** — subtle reverse or soft lift, not an error sound.
4. **New Edition/Refresh Complete** — restrained newsroom chime, 500–1200 ms.
5. **Download Ready** — warm completion tone, 500–1000 ms.
6. **Tab Change** — very subtle, under 250 ms, optional.
7. **Selection** — tiny tactile tick, under 150 ms; avoid on every swipe.
8. **Media Play/Pause** — matched short pair.
9. **Offline/Reconnected** — only when useful; haptic may be preferable.
10. **Error** — calm, short, non-alarming.
11. **Welcome** — optional one-time arrival tone, under 1.5 seconds.

## Sounds likely needing replacement
- `refresh.wav` and `search_complete.wav` are over four seconds and likely too long for routine UI feedback.
- `screen_close.wav`, `magic.wav`, and `welcome.wav` near two seconds should be carefully auditioned for repetition fatigue.
- `loading_start.wav` and `picker_tick.wav` are extremely short; verify they are audible but not sharp through VoiceOver.

## Acquisition brief
Any new sounds must be original or clearly licensed for commercial app redistribution. Avoid copyrighted Disney music, attraction audio, sound-alikes, castle fanfares, or recognizable park recordings. Store license/source documentation in `docs/audio-licenses/`.

## Accessibility
Sounds never replace spoken or visible state. Avoid playing under VoiceOver announcements when possible. Add an independent off/on control and optional intensity/volume only if testing proves necessary.
