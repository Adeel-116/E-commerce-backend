const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');

dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Paths ─────────────────────
const DATA_FILE     = path.resolve(__dirname, '../../data/perfumes.json');  //actual data file
const OUTPUT_FILE   = path.resolve(__dirname, '../../data/perfumes_updated.json'); // updated final perfumes
const PROGRESS_FILE = path.resolve(__dirname, '../../data/cloudinary_progress.json'); //cloudinary Progress
const LOG_FILE      = path.resolve(__dirname, '../../data/migration.log');  //migration Logs file

// concurrency
const CONCURRENCY = 10;

// ─── Logger ───────────────────────────────────────────────────────────────────
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function loadProgress() {
  return fs.existsSync(PROGRESS_FILE)
    ? JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))
    : {};
}

function saveProgress(map) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(map, null, 2));
}

// ─── Build Catalog ────────────────────────────────────────────────────────────
// Scans the entire JSON once and returns a deduplicated map of
// sourceUrl → UrlEntry with a stable Cloudinary public_id per URL.
function buildCatalog(perfumes) {
  const catalog = new Map();

  function add(url, entry) {
    if (!url || typeof url !== 'string' || catalog.has(url)) return;
    catalog.set(url, { sourceUrl: url, ...entry });
  }

  for (const p of perfumes) {
    const brandSlug   = toSlug(p.brand || 'unknown-brand');
    const perfumeSlug = toSlug(p.name  || `perfume-${p.id}`);

    // Brand image — one per brand name, stored as maison/brands/{brand-name}
    if (p.brandImage) {
      add(p.brandImage, {
        type:     'brand',
        label:    p.brand || 'unknown',
        publicId: `maison/brands/${brandSlug}`,
      });
    }

    // Product images — maison/products/{perfume-slug}-1, -2, etc.
    if (Array.isArray(p.images)) {
      p.images.forEach((url, i) => {
        if (!url) return;
        add(url, {
          type:     'product',
          label:    p.name || `perfume-${p.id}`,
          publicId: `maison/products/${perfumeSlug}-${i + 1}`,
        });
      });
    }

    // Accord images — maison/accords/{accord-name}
    if (Array.isArray(p.mainAccords)) {
      p.mainAccords.forEach((a) => {
        if (!a.image) return;
        add(a.image, {
          type:     'accord',
          label:    a.name || 'accord',
          publicId: `maison/accords/${toSlug(a.name || 'accord')}`,
        });
      });
    }

    // Note images — maison/notes/{note-name}
    if (p.notes) {
      for (const tier of ['topNotes', 'middleNotes', 'baseNotes']) {
        if (Array.isArray(p.notes[tier])) {
          p.notes[tier].forEach((n) => {
            if (!n.image) return;
            add(n.image, {
              type:     'note',
              label:    n.name || 'note',
              publicId: `maison/notes/${toSlug(n.name || 'note')}`,
            });
          });
        }
      }
    }
  }

  return catalog;
}

// ─── Upload ───────────────────────────────────────────────────────────────────
async function uploadOne(entry) {
  const result = await cloudinary.uploader.upload(entry.sourceUrl, {
    public_id:      entry.publicId,
    resource_type:  'image',
    overwrite:      false,  // skip if already exists in Cloudinary
    invalidate:     false,
    use_filename:   false,
  });
  return result.secure_url;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function makeTypeStats() {
  return { total: 0, uploaded: 0, skipped: 0, failed: 0 };
}

// ─── Batch Runner ─────────────────────────────────────────────────────────────
async function runBatch(
  entries,
  progress,
  byType
) {
  let idx   = 0;
  let done  = 0;
  const total = entries.length;
  const failedUrls = [];

  async function worker() {
    while (idx < entries.length) {
      const entry = entries[idx++];
      byType[entry.type].total++;

      if (progress[entry.sourceUrl]) {
        byType[entry.type].skipped++;
        done++;
        process.stdout.write(`\r  Progress: ${done}/${total} (cached: ${entry.label})           `);
        continue;
      }

      try {
        const cloudUrl = await uploadOne(entry);
        progress[entry.sourceUrl] = cloudUrl;
        byType[entry.type].uploaded++;
        done++;
        process.stdout.write(`\r  Progress: ${done}/${total} [${entry.type}] ${entry.label}           `);

        // Save checkpoint every 50 new uploads
        if (byType[entry.type].uploaded % 50 === 0) {
          saveProgress(progress);
        }
      } catch (err) {
        byType[entry.type].failed++;
        done++;
        failedUrls.push(entry.sourceUrl);
        process.stdout.write(`\r  Progress: ${done}/${total} [FAILED] ${entry.label}           `);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  console.log(); // newline after progress line

  return failedUrls;
}

// ─── Rewrite JSON ─────────────────────────────────────────────────────────────
function rewriteJson(perfumes, progress) {
  function remap(url) {
    return (url && progress[url]) ? progress[url] : url;
  }

  return perfumes.map((p) => {
    const updated = { ...p };

    if (updated.brandImage) updated.brandImage = remap(updated.brandImage);

    if (Array.isArray(updated.images)) {
      updated.images = updated.images.map(remap);
    }

    if (Array.isArray(updated.mainAccords)) {
      updated.mainAccords = updated.mainAccords.map((a) => ({
        ...a,
        image: remap(a.image),
      }));
    }

    if (updated.notes) {
      const notes = { ...updated.notes };
      for (const tier of ['topNotes', 'middleNotes', 'baseNotes']) {
        if (Array.isArray(notes[tier])) {
          notes[tier] = notes[tier].map((n) => ({
            ...n,
            image: remap(n.image),
          }));
        }
      }
      updated.notes = notes;
    }

    return updated;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  log('═══════════════════════════════════════════════════');
  log('  Cloudinary Image Migration — START');
  log('═══════════════════════════════════════════════════');

  // Load data
  log('Loading perfumes.json...');
  const perfumes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  log(`  ${perfumes.length} perfumes loaded.`);

  // Build catalog
  log('\nBuilding URL catalog...');
  const catalog = buildCatalog(perfumes);
  const entries = [...catalog.values()];

  // Count by type
  const countByType = { brand: 0, accord: 0, note: 0, product: 0 };
  for (const e of entries) countByType[e.type]++;

  log(`   Total unique URLs : ${entries.length}`);
  log(`    brands           : ${countByType.brand}`);
  log(`    accords          : ${countByType.accord}`);
  log(`    notes            : ${countByType.note}`);
  log(`    products         : ${countByType.product}`);

  // Load checkpoint
  const progress = loadProgress();
  const alreadyCached = Object.keys(progress).length;
  const remaining = entries.filter((e) => !progress[e.sourceUrl]);
  log(`\n  Already uploaded  : ${alreadyCached}`);
  log(`  Still to upload   : ${remaining.length}`);

  // Upload
  const byType = {
    brand:   makeTypeStats(),
    accord:  makeTypeStats(),
    note:    makeTypeStats(),
    product: makeTypeStats(),
  };

  if (remaining.length > 0) {
    log(`\nUploading (concurrency: ${CONCURRENCY})...`);
    const failedUrls = await runBatch(entries, progress, byType);
    saveProgress(progress);

    if (failedUrls.length > 0) {
      log(`\n  Failed URLs (${failedUrls.length}):`);
      failedUrls.forEach((u) => log(`    ${u}`));
    }
  } else {
    log('\nAll URLs already uploaded. Skipping upload step.');
    // Still populate byType totals for the report
    for (const e of entries) {
      byType[e.type].total++;
      byType[e.type].skipped++;
    }
  }

  // Rewrite JSON
  log('\nRewriting image URLs in JSON...');
  const updated = rewriteJson(perfumes, progress);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updated, null, 2));
  log(`  Saved to: ${OUTPUT_FILE}`);

  // ─── Final Stats Report ───────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins    = Math.floor(elapsed / 60);
  const secs    = elapsed % 60;

  const totalUploaded = Object.values(byType).reduce((s, t) => s + t.uploaded, 0);
  const totalSkipped  = Object.values(byType).reduce((s, t) => s + t.skipped, 0);
  const totalFailed   = Object.values(byType).reduce((s, t) => s + t.failed, 0);

  log('\n═══════════════════════════════════════════════════');
  log('  MIGRATION STATS');
  log('═══════════════════════════════════════════════════');
  log(`  Time taken    : ${mins}m ${secs}s`);
  log(`  Total URLs    : ${entries.length}`);
  log(`  ✔ Uploaded    : ${totalUploaded}`);
  log(`  ⏩ Skipped     : ${totalSkipped}  (already in Cloudinary)`);
  log(`  ✖ Failed      : ${totalFailed}`);
  log('');
  log('  ┌─────────────┬────────┬──────────┬─────────┬────────┐');
  log('  │ Type        │ Total  │ Uploaded │ Skipped │ Failed │');
  log('  ├─────────────┼────────┼──────────┼─────────┼────────┤');
  for (const [type, s] of Object.entries(byType)) {
    const t = String(type).padEnd(11);
    log(`  │ ${t} │ ${String(s.total).padStart(6)} │ ${String(s.uploaded).padStart(8)} │ ${String(s.skipped).padStart(7)} │ ${String(s.failed).padStart(6)} │`);
  }
  log('  └─────────────┴────────┴──────────┴─────────┴────────┘');
  log('');

  if (totalFailed === 0) {
    log('  ✅ Migration complete — no failures.');
  } else {
    log(`  ⚠️  ${totalFailed} image(s) failed. Check log for details.`);
    log('  Re-run the script to retry failed images.');
  }

  log('  Output file: data/perfumes_updated.json');
  log('  Log file:    data/migration.log');
  log('═══════════════════════════════════════════════════\n');

  logStream.end();
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  logStream.end();
  process.exit(1);
});
