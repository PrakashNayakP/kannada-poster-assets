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

/**
 * Resolves a "premium" catalog entry to the value stored in `items`: an image
 * filename becomes its CDN URL; anything else (an emoji, a quote) is kept as-is.
 */
function resolvePremium(subdir, id, entry) {
  if (IMAGE_EXT.includes(path.extname(entry).toLowerCase())) {
    return cdnUrl(path.join(subdir, id, entry));
  }
  return entry;
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

    const premium = (cat.premium || []).map((e) =>
      resolvePremium("stickers", cat.id, e)
    );

    docs[cat.id] = { name: cat.name, order: cat.order, items, premium };
  }

  await reconcile("stickers", docs);
}

async function syncTemplates() {
  const catalog = JSON.parse(fs.readFileSync("./catalog.json", "utf8"));
  const docs = {};

  for (const cat of catalog.templates || []) {
    const imageUrls = listImages(path.join("templates", cat.id)).map((f) =>
      cdnUrl(path.join("templates", cat.id, f))
    );

    // Skip empty categories so the app doesn't show a blank tab.
    if (imageUrls.length === 0) continue;

    const premium = (cat.premium || []).map((e) =>
      resolvePremium("templates", cat.id, e)
    );

    docs[cat.id] = { name: cat.name, order: cat.order, items: imageUrls, premium };
  }

  await reconcile("templates", docs);
}

async function syncQuotes() {
  const data = JSON.parse(fs.readFileSync("./quotes.json", "utf8"));
  const docs = {};

  for (const cat of data.quotes || []) {
    if (!cat.quotes || cat.quotes.length === 0) continue;
    docs[cat.id] = {
      name: cat.name,
      order: cat.order,
      quotes: cat.quotes,
      premium: cat.premium || [],
    };
  }

  await reconcile("quotes", docs);
}

/**
 * Writes config.json to Firestore config/ads (the app's remote ad config).
 * A single document, so it's a plain overwrite — config.json is the source of
 * truth. The leading "_comment" key is stripped before writing.
 */
async function syncConfig() {
  if (!fs.existsSync("./config.json")) return;

  const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  delete config._comment;

  await db.collection("config").doc("ads").set(config);
  console.log("  config/ads: written");
}

(async () => {
  console.log(
    `Syncing to gh/${CONFIG.githubUser}/${CONFIG.githubRepo}@${CONFIG.branch}` +
      (PRUNE ? "  (prune ON)" : "")
  );
  await syncQuotes();
  await syncStickers();
  await syncTemplates();
  await syncConfig();
  console.log("✓ Sync complete.");
  process.exit(0);
})().catch((e) => {
  console.error("✗ Sync failed:", e.message);
  process.exit(1);
});
