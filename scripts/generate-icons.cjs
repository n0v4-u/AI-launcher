const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'public');

async function main() {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Unable to read icon: ${svgPath}`);
  }

  for (const size of [16, 32, 48, 64, 128, 256]) {
    await sharp(svgPath)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
