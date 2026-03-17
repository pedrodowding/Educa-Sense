
import fs from 'fs';
import path from 'path';
import https from 'https';

const assetsDir = path.join(process.cwd(), 'public', 'assets', 'album');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const items = [
  { name: 'cat.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { name: 'dog.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },
  { name: 'panda.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616412.png' },
  { name: 'rabbit.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616400.png' },
  { name: 'bear.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616553.png' },
  { name: 'penguin.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616538.png' },
  { name: 'elephant.png', url: 'https://cdn-icons-png.flaticon.com/512/616/616550.png' },
  { name: 'rocket.png', url: 'https://cdn-icons-png.flaticon.com/512/3212/3212567.png' },
  { name: 'astronaut.png', url: 'https://cdn-icons-png.flaticon.com/512/3212/3212628.png' },
  { name: 'planet.png', url: 'https://cdn-icons-png.flaticon.com/512/3212/3212452.png' }
];

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(assetsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Error downloading ${filename}: ${err.message}`);
      reject(err);
    });
  });
};

async function downloadAll() {
  console.log('Starting downloads...');
  for (const item of items) {
    try {
      await downloadImage(item.url, item.name);
    } catch (e) {
      console.error(`Failed to download ${item.name}`);
    }
  }
  console.log('All done!');
}

downloadAll();
