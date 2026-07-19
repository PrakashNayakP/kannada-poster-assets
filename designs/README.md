# Editable Designs

Full pre-laid-out posters the app shows on the **Designs** page. Tapping one
opens the editor pre-populated (background + text + stickers), and the user taps
any text to change it.

Unlike `templates/` (flat backgrounds), each design is a **layout JSON** plus a
**pre-rendered thumbnail**.

## Folder layout

```
designs/
  <categoryId>/
    <designId>.json    # the layout (draft schema, with a hosted/gradient background)
    <designId>.png     # full-composite thumbnail (bg + text + stickers)
    <designId>_bg.png  # OPTIONAL: hosted background image (only if not a gradient)
```

`<categoryId>` and each `<designId>` must match an entry under `"designs"` in
[`../catalog.json`](../catalog.json).

## How to author a design

1. **Build the poster in the app** (a debug build).
2. Tap the **Save (💾)** icon in the editor top bar — it writes a folder
   (path shown in a toast) containing `template.json`, `thumbnail.png`, and:
   - `background.png` — only if the background is a **phone photo** (a
     Templates-screen or gradient/solid background keeps its dynamic URL/spec
     automatically).
   - `asset_1.png`, `asset_2.png`, … — only for **manually-picked** phone images
     (gallery PIP, mask), each referenced as `"REPLACE_WITH_URL:asset_N.png"`.
     Library stickers and Templates-screen PIPs keep their URLs and aren't
     exported.

   A design built entirely from Templates/Stickers/gradients exports **just
   `template.json` + `thumbnail.png`**, already fully wired.
3. Copy those in here, renamed to your `<designId>`:
   - `template.json`  → `designs/<categoryId>/<designId>.json`
   - `thumbnail.png`  → `designs/<categoryId>/<designId>.png`
   - `background.png` → `designs/<categoryId>/<designId>_bg.png` (only if one was
     exported)
   - each `asset_N.png` → e.g. `designs/<categoryId>/<designId>_pip1.png`
4. **Fix any `REPLACE_WITH_*` placeholders** the export left (none if the design
   used no phone images):
   - `"imagePath"` (only if `REPLACE_WITH_BACKGROUND…`) → the CDN URL of
     `<designId>_bg.png`
     (`https://cdn.jsdelivr.net/gh/PrakashNayakP/kannada-poster-assets@main/designs/<categoryId>/<designId>_bg.png`),
     **or** a `"gradient:AARRGGBB,AARRGGBB"` / `"gradient:RRGGBB,RRGGBB"` spec.
   - each `"REPLACE_WITH_URL:asset_N.png"` (sticker/PIP/mask `source`) → the CDN
     URL of the file you uploaded for that `asset_N.png`.
   - `"thumb"` can be left as-is — the app ignores it (the grid thumbnail comes
     from the Firestore `thumb` pointer, which `sync.js` fills from
     `<designId>.png`).
5. Add the item to `catalog.json` under the right `"designs"` category:
   `{ "id": "<designId>", "name": "...", "premium": false, "tags": "keywords" }`.
6. **Upload to GitHub** — the CDN only serves files once they're pushed:
   ```
   git add designs/ catalog.json
   git commit -m "Add design: <designId>"
   git push
   ```
7. **Seed Firestore** — from the repo root:
   ```
   node sync.js          # or: npm run sync   (add/update; never deletes)
   node sync.js --prune  # or: npm run sync:prune   (also removes deleted ones)
   ```
   Open the app → **Designs**. (jsDelivr caches `@main` URLs up to ~12h; if a new
   file 404s, purge it: `https://purge.jsdelivr.net/gh/PrakashNayakP/kannada-poster-assets@main/designs/<categoryId>/<designId>.png`.)

> One-time setup (Node, `serviceAccountKey.json`, `npm install`) and the full
> admin guide live in the app repo's `docs/asset-management.md`.

## Notes

- Sticker/logo `source`s inside the JSON must be **hosted URLs** (the app loads
  them over the network). Stickers from the app are already CDN URLs; a brand
  logo would need uploading if you include one.
- `premium: true` gates the design behind a rewarded ad, like premium stickers.
- `tags` are space-separated search keywords (matched on the Designs page).
- `sync.js` only writes items whose `.json` file exists, so you can list a design
  in `catalog.json` before its assets are ready without breaking the app.
