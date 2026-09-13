---
description: Import new vocabulary/phrase worksheet photos from Photo/inbox into data/content.json, then archive them so they're never re-analyzed.
---

# Import weekly worksheet photos

The user (Alain) periodically photographs new Spanish worksheets from his
daughter's teacher (Astrid) and drops them in `Photo/inbox/`. This skill
transcribes only the *new* photos into `data/content.json` and never
re-reads photos that were already imported.

## Steps

1. **List `Photo/inbox/`** (ignore `.gitkeep`). If it's empty, tell the user
   there's nothing new to import and stop here.

2. **Cross-check `data/processed_photos.json`** — if a file in the inbox
   already has an entry there (same filename), skip it and warn the user
   (it should have been moved out already; ask before re-processing).

3. **For each new photo**, read it (image read) and transcribe its content:
   - Every word/phrase pair as `{ "es": "...", "fr": "..." }`.
   - Group items into subsections the way the worksheet groups them
     (e.g. by heading/category on the page).
   - Pick `"kind": "vocab"` for standalone words, `"phrase"` for
     full sentences/instructions (this enables the "Completar" fill-blank
     mode — see `README.md`).
   - Capture any grammar notes/rules written on the worksheet as a
     theme-level `"notes"` array (see the `saludos` theme in
     `data/content.json` for the expected shape).
   - Use kebab-case ids, prefixed by the theme id for subsections
     (e.g. theme `familia`, subsection `familia-parientes`).

4. **Decide theme placement**: if the photo is clearly a continuation of an
   existing theme (same topic as one already in `content.json`), add new
   subsections to that theme. Otherwise create a new theme. If it's
   ambiguous, ask the user rather than guessing.

5. **Edit `data/content.json`** to add the new theme/subsections, keeping
   the existing structure and formatting intact. Validate it's well-formed
   JSON afterwards (e.g. read it back or run a quick parse check).

6. **Archive the photo**: move it from `Photo/inbox/` to `Photo/` (the
   archive folder — plain `git mv` if the repo tracks it, otherwise a
   regular move).

7. **Update `data/processed_photos.json`**: append `{ file, importedDate
   (today, ISO), themeIds }` for each photo just processed.

8. **Report a summary**: which theme(s)/subsection(s) were added, item
   counts, and explicitly ask the user to skim the French translations for
   accuracy — vision transcription of handwriting can misread a word.

## Guardrails

- Never re-open or re-transcribe a photo already listed in
  `data/processed_photos.json` or already sitting outside `Photo/inbox/`.
- Don't rewrite or "clean up" existing themes/subsections while importing —
  only add.
- If a photo is blurry/unreadable, say so and ask the user for a clearer
  shot instead of guessing at content.
