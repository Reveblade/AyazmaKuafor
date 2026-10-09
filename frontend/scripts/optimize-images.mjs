/**
 * Downloads barber images from Unsplash and saves a single WebP per photo.
 * Run: npm run images
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public', 'images');

const IMAGES = {
  hero: [{ name: 'hero-main', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=80', width: 1200 }],
  gallery: [
    { name: 'gallery-1', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80', width: 800 },
    { name: 'gallery-2', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80', width: 800 },
    { name: 'gallery-3', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80', width: 800 },
    { name: 'gallery-4', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80', width: 800 },
  ],
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.log('sharp not installed. Run: npm install -D sharp');
    return;
  }

  for (const [folder, items] of Object.entries(IMAGES)) {
    const dir = path.join(publicDir, folder);
    await mkdir(dir, { recursive: true });

    for (const { name, url, width } of items) {
      try {
        console.log(`Processing ${folder}/${name}.webp...`);
        const buffer = await download(url);
        await sharp(buffer).resize(width).webp({ quality: 82 }).toFile(path.join(dir, `${name}.webp`));
      } catch (err) {
        console.warn(`Skipped ${folder}/${name}:`, err.message);
      }
    }
  }

  console.log('Done!');
}

main().catch(console.error);
