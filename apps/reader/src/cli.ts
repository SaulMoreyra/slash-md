import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "./build-site";

const here = path.dirname(fileURLToPath(import.meta.url));
const readerDir = path.resolve(here, "..");
const root = process.env.SITE_ROOT || process.cwd();
const out = process.env.SITE_OUT || path.join(root, "_site");
const basePath = process.env.SITE_BASE;

const result = await buildSite({ root, out, basePath, readerDir });
if (result.skipped) {
  console.log(result.reason);
  process.exit(0);
}
console.log(`slash-md site: wrote ${result.pages.length} pages to ${result.out}`);
