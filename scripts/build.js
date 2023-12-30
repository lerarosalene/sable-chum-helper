const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const {spawn} = require("child_process");

const fsp = fs.promises;

function system(command, args, opts) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: "inherit",
      ...(opts || {}),
    });
    process.on("exit", (code) => {
      if (code === 0) {
        return void resolve();
      }

      if (code === null) {
        return void reject(new Error(`Process exited abruptly`));
      }

      reject(new Error(`Process exited with code ${code}`));
    });
  });
}

async function main() {
  await esbuild.build({
    entryPoints: [path.join('src', 'index.js')],
    bundle: true,
    minify: true,
    outfile: path.join('dist', 'sable-chum-helper.js'),
    external: ["fs", "path", "readline/promises"],
    loader: {
      ".json": "json"
    }
  });

  await fsp.mkdir('build', { recursive: true });
  await system("node", ["--experimental-sea-config", "sea-config.json"]);
  await fsp.copyFile(process.execPath, path.join("dist", "sable-chum-helper.exe"))

  const postjectConfig = JSON.parse(
    await fsp.readFile(require.resolve("postject/package.json"), "utf-8"),
  );

  await system("node", [
    path.join(
      path.dirname(require.resolve("postject/package.json")),
      postjectConfig.bin.postject,
    ),
    path.join("dist", "sable-chum-helper.exe"),
    "NODE_SEA_BLOB",
    path.join("build", "smh.blob"),
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ]);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
