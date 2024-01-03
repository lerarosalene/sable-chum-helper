import fs from "fs";
import path from "path";
import readline from "readline/promises";
import chums from "./__generated/chums.json";

const fsp = fs.promises;

function getSaveDir() {
  if (process.argv[2]) {
    return path.resolve(process.argv[2]);
  }
  return path.resolve(process.env.USERPROFILE, "AppData", "LocalLow", "Shedworks", "Sable", "SaveData");
}

async function main() {
  const saveDirPath = getSaveDir();
  const saveManagerData = JSON.parse(await fsp.readFile(path.join(saveDirPath, 'SaveManager'), 'utf-8'));
  const saves = saveManagerData.SaveManager.value.SaveFiles.filter(save => save.ID);
  process.stdout.write('Save files: \n');
  saves.forEach((save, index) => {
    const id = save.ID.split('_')[2].toUpperCase();
    process.stdout.write(`${index + 1}. ${id} (${save.masksCollected} masks)\n`);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Enter save file number: ');
  const parsed = Number(answer);
  const index = parsed - 1;

  const saveFile = saves[index];
  if (!saveFile) {
    throw new Error(`Can't find save #${answer}`);
  }

  await patch(saveFile.ID);
  await rl.question('Patch completed! Press [Enter] to exit.');
}

async function patch(name) {
  const saveDirPath = getSaveDir();
  const saveFilePath = path.join(saveDirPath, name);

  const contentsRaw = await fsp.readFile(saveFilePath, 'utf-8');
  const saveData = JSON.parse(contentsRaw);

  const notCollected = saveData.ChumsMonitor.value.collectibles.filter(chum => !chum.hasBeenCollected).map(chum => chum.instanceId);
  const originalChumsMap = chums.reduce((acc, chum) => {
    acc.set(chum.id, chum);
    return acc;
  }, new Map());

  const playerPosition = saveData.playerPosition.value;
  const notCollectedWithDistance = notCollected.map(id => {
    const originalPosition = originalChumsMap.get(id).position;
    const dx = originalPosition.x - playerPosition.x;
    const dy = originalPosition.y - playerPosition.y;
    const dz = originalPosition.z - playerPosition.z;

    return {
      id,
      d2: dx * dx + dy * dy + dz * dz
    }
  });

  notCollectedWithDistance.sort((a, b) => a.d2 - b.d2);
  const selected = notCollectedWithDistance.slice(0, 13).map(a => a.id);

  let newMarkers = [];
  selected.forEach((id, index) => {
    const original = originalChumsMap.get(id);
    const marker = {
      _mapLocation: {
        x: original.position.x,
        y: original.position.z,
      },
      StyleId: index,
    };
    newMarkers.push(marker);
  });

  saveData.CustomMarkerManager.value.Markers = newMarkers;

  await fsp.copyFile(saveFilePath, saveFilePath + '.map-helper-backup');
  await fsp.writeFile(saveFilePath, JSON.stringify(saveData, null, 2));
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
