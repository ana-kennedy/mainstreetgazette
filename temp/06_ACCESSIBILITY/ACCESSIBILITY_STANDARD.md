# Accessibility Standard

## VoiceOver
- Every root and section title is a real heading.
- Cards are one focus stop by default, with `accessibilityActions` for secondary actions.
- Do not announce decorative images, icons, gradients, dividers, badges, or seasonal art.
- Announce meaningful type/state in words: Podcast, Video, Ready Offline, Playing, Saved.
- Do not redundantly announce both an icon and its text label.
- Restore focus after closing menus, readers, and modals.
- Support two-finger scrub consistently.
- Magic Tap controls current media when appropriate; never hijack it unpredictably.
- Announce loading/status changes with polite live regions and avoid repeated chatter.

## Braille
- Concise labels and predictable control names.
- Compact layout must reduce visual density without changing semantic order.
- Avoid punctuation-heavy decorative labels and emoji in accessibility labels.
- Routing keys activate the expected item.
- External keyboard commands must be documented.

## Low vision
- Full Dynamic Type with no clipping or inaccessible truncation.
- Minimum 44 by 44 point targets.
- Strong visible focus and selected states.
- Never rely only on color.
- High contrast removes translucency and low-contrast gradients.
- Text-first and reduced-artwork options.

## Motion and sound
Respect Reduce Motion, Reduce Transparency, silent mode expectations, and user sound settings. Do not require motion or sound to understand state.
