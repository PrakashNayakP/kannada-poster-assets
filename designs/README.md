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
   (path shown in a toast) containing `template.json`, `background.png` and
   `thumbnail.png`.
3. Copy those in here, renamed to your `<designId>`:
   - `template.json`  → `designs/<categoryId>/<designId>.json`
   - `thumbnail.png`  → `designs/<categoryId>/<designId>.png`
   - `background.png` → `designs/<categoryId>/<designId>_bg.png` (only if the
     background is a photo/image; skip for a solid/gradient background)
4. **Edit the JSON's two placeholders:**
   - `"imagePath"` → the CDN URL of `<designId>_bg.png`
     (`https://cdn.jsdelivr.net/gh/PrakashNayakP/kannada-poster-assets@main/designs/<categoryId>/<designId>_bg.png`),
     **or** a `"gradient:AARRGGBB,AARRGGBB"` / `"gradient:RRGGBB,RRGGBB"` spec for
     a solid/gradient background (no `_bg.png` needed).
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
