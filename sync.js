/*
 * Syncs sticker + template images from this repo into Firestore.
 *
 * For every image file it builds a jsDelivr CDN URL and writes the matching
 * Firestore document, so the app picks it up. The repo is the source of truth.
 *
 *   node sync.js            upsert (add / update; never deletes)
 *   node sync.js --prune    also remove Firestore entries whose files/categories
 *                           no longer exist here (full reconcile)
 *
 * Setup: see README.md (edit CONFIG below, add serviceAccountKey.json,
 * run `npm install`).
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ===== EDIT THESE =========================================================
const CONFIG = {
  githubUser: "PrakashNayakP", // <-- your GitHub username
  githubRepo: "kannada-poster-assets", // <-- your repo name
  branch: "main",
};
// ==========================================================================

const PRUNE = process.argv.includes("--prune");
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];

if (CONFIG.githubUser === "YOUR_GITHUB_USERNAME") {
  console.error("✗ Edit CONFIG.githubUser in sync.js first.");
  process.exit(1);
}
if (!fs.existsSync("./serviceAccountKey.json")) {
  console.error("✗ serviceAccountKey.json missing — see README.md, step 3.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});
const db = admin.firestore();

function cdnUrl(relPath) {
  const clean = relPath.split(path.sep).join("/");
  return (
    `https://cdn.jsdelivr.net/gh/${CONFIG.githubUser}/` +
    `${CONFIG.githubRepo}@${CONFIG.branch}/${clean}`
  );
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
    .sort();
}

/** Writes `docs`, and (only with --prune) deletes docs not in `docs`. */
async function reconcile(collection, docs) {
  const batch = db.batch();

  for (const [id, data] of Object.entries(docs)) {
    batch.set(db.collection(collection).doc(id), data);
  }

  let removed = 0;
  if (PRUNE) {
    const snapshot = await db.collection(collection).get();
    for (const doc of snapshot.docs) {
      if (!docs[doc.id]) {
        batch.delete(doc.ref);
        removed++;
      }
    }
  }

  await batch.commit();
  console.log(
    `  ${collection}: ${Object.keys(docs).length} written` +
      (PRUNE ? `, ${removed} removed` : "")
  );
}

async function syncStickers() {
  const catalog = JSON.parse(fs.readFileSync("./catalog.json", "utf8"));
  const docs = {};

  for (const cat of catalog.stickers) {
    const imageUrls = listImages(path.join("stickers", cat.id)).map((f) =>
      cdnUrl(path.join("stickers", cat.id, f))
    );
    const items = [...(cat.emojis || []), ...imageUrls];

    // Skip empty categories so the app doesn't show a blank tab.
    if (items.length === 0) continue;

    docs[cat.id] = { name: cat.name, order: cat.order, items };
  }

  await reconcile("stickers", docs);
}

async function syncTemplates() {
  // Filename convention: "01-Mountain.jpg" -> order 1, name "Mountain".
  const docs = {};

  for (const file of listImages("templates")) {
    const base = path.basename(file, path.extname(file));
    const match = base.match(/^(\d+)[-_ ](.+)$/);

    const order = match ? parseInt(match[1], 10) : 999;
    const name = (match ? match[2] : base).replace(/[-_]+/g, " ").trim();
    const id = base.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    docs[id] = { name, order, imageUrl: cdnUrl(path.join("templates", file)) };
  }

  await reconcile("templates", docs);
}

(async () => {
  console.log(
    `Syncing to gh/${CONFIG.githubUser}/${CONFIG.githubRepo}@${CONFIG.branch}` +
      (PRUNE ? "  (prune ON)" : "")
  );
  await syncStickers();
  await syncTemplates();
  console.log("✓ Sync complete.");
  process.exit(0);
})().catch((e) => {
  console.error("✗ Sync failed:", e.message);
  process.exit(1);
});
