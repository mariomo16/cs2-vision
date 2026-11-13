import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";
import {
  DIST_DIR,
  type ExtensionManifest,
  listFiles,
  RELEASE_DIR,
} from "./lib/extension.ts";

const extensionDir = path.resolve(process.argv[2] ?? DIST_DIR);

/**
 * Optional suffix that distinguishes the packaged file, e.g. `-develop`
 */
const label = (process.argv[3] ?? "").replace(/[^a-zA-Z0-9-]/g, "");

const manifest = JSON.parse(
  await readFile(path.join(extensionDir, "manifest.json"), "utf8"),
) as ExtensionManifest;

/**
 * Chrome Web Store requires the extension manifest at the root of the ZIP, so
 * every file is stored relative to the extension directory.
 */
const entries: Record<string, Uint8Array> = {};

for (const relativePath of await listFiles(extensionDir)) {
  entries[relativePath] = new Uint8Array(
    await readFile(path.join(extensionDir, relativePath)),
  );
}

const archive = zipSync(entries, { level: 9 });

await mkdir(RELEASE_DIR, { recursive: true });

const archivePath = path.join(
  RELEASE_DIR,
  `cs2-vision-${manifest.version}${label ? `-${label}` : ""}.zip`,
);

await writeFile(archivePath, archive);

console.log(
  `Packaged ${path.relative(process.cwd(), extensionDir)} into ${path.relative(
    process.cwd(),
    archivePath,
  )} (${Object.keys(entries).length} files, ${Math.round(archive.length / 1024)} kB)`,
);
