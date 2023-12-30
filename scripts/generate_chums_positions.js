const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

async function main() {
  const raw = await fsp.readFile(path.join('src', 'full_completion_save.json'), 'utf-8');
  const data = JSON.parse(raw);

  const chums = data.ChumsMonitor.value.collectibles.map(chum => {
    return {
      id: chum.instanceId,
      position: chum.positionOfCapture,
    }
  });

  await fsp.mkdir(path.join('src', '__generated'));
  await fsp.writeFile(path.join('src', '__generated', 'chums.json'), JSON.stringify(chums));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
