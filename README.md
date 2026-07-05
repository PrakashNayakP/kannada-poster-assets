# Kannada Poster Maker — Asset Repo

Manage the app's **sticker** and **template** images here. Drop images into
folders, push to GitHub, run one command, and they go live in the app.

- Images are served free via the **jsDelivr CDN** (backed by this public GitHub repo).
- Firestore only stores the image **URLs** — the sync script generates them for you.
- **Quotes** are text-only and managed directly in the Firebase console, not here.

---

## One-time setup

### 1. Create the GitHub repo
- Make a **public** repo on GitHub (e.g. `kannada-poster-assets`).
- Push this folder to it:
  ```
  git init
  git add .
  git commit -m "Asset repo"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/kannada-poster-assets.git
  git push -u origin main
  ```

### 2. Point the script at your repo
Open **`sync.js`** and edit the `CONFIG` block:
```js
const CONFIG = {
  githubUser: "YOUR_GITHUB_USERNAME",
  githubRepo: "kannada-poster-assets",
  branch: "main",
};
```

### 3. Add your admin key (`serviceAccountKey.json`)
The script writes to Firestore as an admin, so it needs a service account key:

1. Firebase Console → ⚙️ **Project settings** → **Service accounts** tab
2. Click **Generate new private key** → a `.json` file downloads
3. Rename it to **`serviceAccountKey.json`** and put it in this folder

> This file is a secret. It's already in `.gitignore` — never commit it.

### 4. Install dependencies
```
npm install
```

---

## Everyday workflow

### Add / change **stickers**
- Sticker images must be **transparent PNGs**.
- Drop them into the category folder: `stickers/festive/`, `stickers/art/`, etc.
- To add a **new category**, add an entry to `catalog.json` and create the folder:
  ```json
  { "id": "wedding", "name": "Wedding", "order": 6, "emojis": [] }
  ```
- Categories can mix emojis (listed in `catalog.json`) and image files.

### Add / change **templates**
- Drop background images into `templates/`.
- Name them `<order>-<Name>.<ext>` so the app shows them in order with a title:
  - `01-Mountain.jpg` → order 1, name "Mountain"
  - `02-Diwali Night.png` → order 2, name "Diwali Night"

### Publish
```
git add .
git commit -m "Add stickers"
git push
npm run sync
```
That's it — the app picks up changes on its next open.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run sync` | Add/update stickers & templates from the current files. Never deletes. |
| `npm run sync:prune` | Same, **and** removes Firestore entries whose files/categories no longer exist here (makes the repo the exact source of truth). |

---

## Notes & gotchas

- **Push before you sync.** The CDN URL only works once the image is on GitHub.
  The order (push then sync) matters for the image to actually load in the app.
- **jsDelivr caching:** `@main` URLs are CDN-cached for up to ~12 hours. If an
  updated image doesn't appear immediately, that's why. To force-refresh a
  specific file you can purge it at `https://purge.jsdelivr.net/gh/USER/REPO@main/path`.
- **Deleting content:** removing an image from a category folder and running
  `npm run sync` removes it from that category. Removing a whole category or a
  template file only takes effect with `npm run sync:prune`.
- The app has **built-in fallbacks** (bundled emojis + gradient templates), so
  it keeps working even if Firestore is empty or the device is offline.
