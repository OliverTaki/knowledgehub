import { chromium } from "playwright";
import fs from "node:fs";

const userDataDir = "playwright-profile/x";
fs.mkdirSync(userDataDir, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo"
});

const page = await context.newPage();
await page.goto("https://x.com/login", { waitUntil: "domcontentloaded" });

console.log("");
console.log("Xにログインしてください。ログイン後、このターミナルでEnterを押すと保存して終了します。");
console.log("");

process.stdin.resume();
process.stdin.once("data", async () => {
  await context.storageState({ path: "playwright-profile/x-storage-state.json" });
  await context.close();
  process.exit(0);
});
