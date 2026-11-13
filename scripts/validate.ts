import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DIST_DIR,
  type ExtensionManifest,
  listFiles,
  listTopLevel,
  matchesResourcePattern,
  ROOT_DIR,
} from "./lib/extension.ts";

const extensionDir = path.resolve(process.argv[2] ?? DIST_DIR);

const errors: string[] = [];
const warnings: string[] = [];

const fail = (message: string) => errors.push(message);
const warn = (message: string) => warnings.push(message);

function report(): never {
  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }
  for (const error of errors) {
    console.error(`error: ${error}`);
  }

  console.log(
    errors.length === 0
      ? `Validated ${path.relative(process.cwd(), extensionDir)}: the extension is complete.`
      : `Validated ${path.relative(process.cwd(), extensionDir)}: ${errors.length} error(s).`,
  );

  process.exit(errors.length === 0 ? 0 : 1);
}

let manifest: ExtensionManifest;

try {
  manifest = JSON.parse(
    await readFile(path.join(extensionDir, "manifest.json"), "utf8"),
  ) as ExtensionManifest;
} catch (error) {
  fail(
    `manifest.json could not be read or parsed: ${(error as Error).message}`,
  );
  report();
}

if (manifest.manifest_version !== 3) {
  fail(
    `manifest_version must be 3, found ${JSON.stringify(manifest.manifest_version)}.`,
  );
}

if (!manifest.name || !manifest.version) {
  fail("manifest.json must declare both 'name' and 'version'.");
} else if (!/^\d+(\.\d+){0,3}$/.test(manifest.version)) {
  fail(`manifest version "${manifest.version}" is not a valid Chrome version.`);
}

const packageJson = JSON.parse(
  await readFile(path.join(ROOT_DIR, "package.json"), "utf8"),
) as { version?: string };

if (packageJson.version !== manifest.version) {
  fail(
    `manifest version (${manifest.version}) does not match package.json version (${packageJson.version}).`,
  );
}

const presentFiles = new Set(await listFiles(extensionDir));

const requireFile = (relativePath: string, context: string) => {
  if (!presentFiles.has(relativePath)) {
    fail(
      `${context} references "${relativePath}", which is missing from the build.`,
    );
  }
};

for (const [size, iconPath] of Object.entries(manifest.icons ?? {})) {
  requireFile(iconPath, `icons["${size}"]`);
}

if (manifest.background?.service_worker) {
  requireFile(manifest.background.service_worker, "background.service_worker");
} else {
  fail("manifest.json must declare background.service_worker.");
}

for (const script of manifest.content_scripts ?? []) {
  for (const jsFile of script.js ?? []) {
    requireFile(jsFile, "content_scripts.js");
  }
  for (const cssFile of script.css ?? []) {
    requireFile(cssFile, "content_scripts.css");
  }
  if (!script.matches?.length) {
    fail(
      "every content_scripts entry must declare at least one match pattern.",
    );
  }
}

// Files the manifest points at, resolved from the resource patterns.
const referencedFiles = new Set<string>(["manifest.json"]);

for (const iconPath of Object.values(manifest.icons ?? {})) {
  referencedFiles.add(iconPath);
}

if (manifest.background?.service_worker) {
  referencedFiles.add(manifest.background.service_worker);
}

for (const script of manifest.content_scripts ?? []) {
  for (const jsFile of script.js ?? []) {
    referencedFiles.add(jsFile);
  }
  for (const cssFile of script.css ?? []) {
    referencedFiles.add(cssFile);
  }
}

for (const resource of manifest.web_accessible_resources ?? []) {
  for (const pattern of resource.resources) {
    const matched = [...presentFiles].filter((file) =>
      matchesResourcePattern(pattern, file),
    );

    if (matched.length === 0) {
      fail(
        `web_accessible_resources pattern "${pattern}" does not match any file in the build.`,
      );
    }

    for (const file of matched) {
      referencedFiles.add(file);
    }
  }
}

const getUrlPattern = /chrome\.runtime\.getURL\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

for (const bundle of ["content.js", "background.js"]) {
  if (!presentFiles.has(bundle)) continue;

  const source = await readFile(path.join(extensionDir, bundle), "utf8");

  for (const match of source.matchAll(getUrlPattern)) {
    const assetPath = match[1];

    if (!assetPath) continue;

    if (assetPath.includes("${")) continue;

    if (!presentFiles.has(assetPath)) {
      fail(
        `${bundle} loads "${assetPath}" through chrome.runtime.getURL(), but it is missing from the build.`,
      );
    } else {
      referencedFiles.add(assetPath);
    }
  }
}

// Anything shipped but not referenced is dead weight in the published package.
for (const file of presentFiles) {
  if (!referencedFiles.has(file)) {
    warn(
      `"${file}" is not referenced by manifest.json and would be published unused.`,
    );
  }
}

for (const entry of await listTopLevel(extensionDir)) {
  const isReferenced =
    referencedFiles.has(entry) ||
    [...referencedFiles].some((file) => file.startsWith(`${entry}/`));

  if (!isReferenced) {
    fail(
      `unexpected entry "${entry}" at the extension root. The build directory was probably not cleaned.`,
    );
  }
}

report();
