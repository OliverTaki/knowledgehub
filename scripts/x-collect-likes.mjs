import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { appendJsonl, readJson, writeJson } from "./lib/jsonl.mjs";
import { extractStatusId, normalizeXUrl, nowIso, uniqueBy } from "./lib/x-utils.mjs";

const RAW_PATH = "data/raw/x_likes.jsonl";
const SEEN_PATH = "data/raw/seen_x_status_ids.json";
const DEBUG_DIR = "debug";
const userDataDir = "playwright-profile/x";
const storageStatePath = "playwright-profile/x-storage-state.json";

const EXPLICIT_SOURCE_URL = process.env.X_SOURCE_URL || "";
const HEADLESS = process.env.HEADLESS === "false" ? false : true;
const MAX_NEW = Number(process.env.MAX_NEW || 300);
const MAX_SCROLLS = Number(process.env.MAX_SCROLLS || 80);
const SCROLL_DELAY_MS = Number(process.env.SCROLL_DELAY_MS || 1400);

if (!fs.existsSync(userDataDir)) {
  throw new Error("playwright-profile/x がありません。初回だけ npm run auth:x を実行してください。");
}

function debugStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function saveDebug(page, reason) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const stamp = debugStamp();
  const base = path.join(DEBUG_DIR, `x-likes-failure-${stamp}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const html = await page.content().catch(() => "");
  fs.writeFileSync(`${base}.html`, html, "utf8");
  fs.writeFileSync(`${base}.txt`, [
    `reason=${reason}`,
    `url=${page.url()}`,
    `time=${new Date().toISOString()}`
  ].join("\n") + "\n", "utf8");
  return base;
}

async function waitForUsablePage(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function isLoginPage(page) {
  const url = page.url();
  if (url.includes("/login") || url.includes("/i/flow/login")) return true;
  const loginLike = await page.locator('input[name="text"], input[name="password"], a[href="/login"]').count().catch(() => 0);
  return loginLike > 0;
}

async function detectProfileHandle(page) {
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForUsablePage(page);

  if (await isLoginPage(page)) {
    throw new Error("Xがログイン画面を返しています。npm run auth:x を再実行してください。");
  }

  const profileHref = await page.locator('a[data-testid="AppTabBar_Profile_Link"]').first().getAttribute("href").catch(() => "");
  if (profileHref && /^\/[A-Za-z0-9_]{1,15}$/.test(profileHref)) {
    return profileHref.slice(1);
  }

  const candidate = await page.evaluate(() => {
    const reserved = new Set([
      "home", "explore", "notifications", "messages", "i", "settings",
      "compose", "search", "jobs", "premium", "verified-orgs"
    ]);

    const hrefs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href") || "")
      .filter((href) => /^\/[A-Za-z0-9_]{1,15}$/.test(href))
      .map((href) => href.slice(1))
      .filter((name) => !reserved.has(name.toLowerCase()));

    return hrefs[0] || "";
  });

  if (!candidate) {
    const debugBase = await saveDebug(page, "could_not_detect_profile_handle");
    throw new Error(`Xのプロフィールhandleを推定できません。X_SOURCE_URLを指定してください。Debug: ${debugBase}.png / .html`);
  }

  return candidate;
}

async function resolveSourceUrl(page) {
  if (EXPLICIT_SOURCE_URL) return EXPLICIT_SOURCE_URL;
  const handle = await detectProfileHandle(page);
  return `https://x.com/${handle}/likes`;
}

async function waitForTweetsOrFail(page, sourceUrl) {
  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForUsablePage(page);

  if (await isLoginPage(page)) {
    const debugBase = await saveDebug(page, "login_required_on_source_url");
    throw new Error(`Xがログイン画面を返しています。npm run auth:x を再実行してください。Debug: ${debugBase}.png / .html`);
  }

  const selectors = [
    'article[data-testid="tweet"]',
    'article',
    '[data-testid="cellInnerDiv"]'
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count().catch(() => 0);
    if (count > 0) return;
  }

  const emptyTexts = [
    "まだいいねしていません",
    "You haven’t liked any posts yet",
    "These posts are protected",
    "Something went wrong",
    "問題が発生しました"
  ];

  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const matchedEmpty = emptyTexts.find((text) => bodyText.includes(text));

  const debugBase = await saveDebug(page, matchedEmpty || "no_tweet_articles_found");
  throw new Error(
    `Xのポストが見つかりません。source=${sourceUrl} reason=${matchedEmpty || "no_tweet_articles_found"} Debug: ${debugBase}.png / .html`
  );
}

const seen = new Set(readJson(SEEN_PATH, []));

async function createContext() {
  const contextOptions = {
    viewport: { width: 1280, height: 1000 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo"
  };

  if (fs.existsSync(storageStatePath)) {
    const browser = await chromium.launch({
      headless: HEADLESS,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    const context = await browser.newContext({
      ...contextOptions,
      storageState: storageStatePath
    });
    return { context, browser, authSource: storageStatePath };
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    ...contextOptions,
    headless: HEADLESS,
    args: ["--disable-blink-features=AutomationControlled"]
  });
  return { context, browser: null, authSource: userDataDir };
}

const { context, browser, authSource } = await createContext();

const page = await context.newPage();
const sourceUrl = await resolveSourceUrl(page);
await waitForTweetsOrFail(page, sourceUrl);

const collected = [];
let unchangedRounds = 0;
let previousCount = 0;

for (let scrollIndex = 0; scrollIndex < MAX_SCROLLS; scrollIndex += 1) {
  const batch = await page.locator('article[data-testid="tweet"], article').evaluateAll((articles) => {
    return articles.map((article) => {
      const statusLinks = Array.from(article.querySelectorAll('a[href*="/status/"]'))
        .map((a) => a.href)
        .filter(Boolean);

      const primaryUrl = statusLinks[0] || "";
      const timeEl = article.querySelector("time");
      const postedAt = timeEl ? timeEl.getAttribute("datetime") : "";

      const userLinks = Array.from(article.querySelectorAll('a[href^="/"]'))
        .map((a) => a.getAttribute("href"))
        .filter(Boolean);

      const handleCandidate = userLinks.find((href) => {
        return /^\/[A-Za-z0-9_]{1,15}$/.test(href);
      }) || "";

      const images = Array.from(article.querySelectorAll("img"))
        .map((img) => ({
          src: img.src || "",
          alt: img.alt || ""
        }))
        .filter((img) => img.src);

      return {
        primaryUrl,
        postedAt,
        handle: handleCandidate ? "@" + handleCandidate.slice(1) : "",
        text: article.innerText || "",
        allStatusLinks: statusLinks,
        images
      };
    });
  });

  for (const item of batch) {
    const url = normalizeXUrl(item.primaryUrl);
    const statusId = extractStatusId(url);
    if (!statusId || seen.has(statusId)) continue;

    collected.push({
      schema_version: 1,
      source: "x_like",
      collected_at: nowIso(),
      status_id: statusId,
      url,
      posted_at: item.postedAt || "",
      author_handle: item.handle || "",
      text: item.text || "",
      media: item.images || [],
      related_status_urls: Array.from(new Set((item.allStatusLinks || []).map(normalizeXUrl))).filter(Boolean),
      processing: {
        wire_status: "raw",
        needs_context_review: true,
        needs_reply_parent_review: true,
        needs_followup_research: true
      }
    });

    seen.add(statusId);
  }

  const uniqueCollected = uniqueBy(collected, (item) => item.status_id);
  collected.length = 0;
  collected.push(...uniqueCollected);

  if (collected.length >= MAX_NEW) break;

  if (collected.length === previousCount) {
    unchangedRounds += 1;
  } else {
    unchangedRounds = 0;
    previousCount = collected.length;
  }

  if (unchangedRounds >= 8) break;

  await page.mouse.wheel(0, 2600);
  await page.waitForTimeout(SCROLL_DELAY_MS);
}

const newRecords = uniqueBy(collected, (item) => item.status_id).slice(0, MAX_NEW);
appendJsonl(RAW_PATH, newRecords);
writeJson(SEEN_PATH, Array.from(seen).sort());

await context.close();
if (browser) await browser.close();

console.log(`Collected ${newRecords.length} new liked posts.`);
console.log(`Source: ${sourceUrl}`);
console.log(`Raw: ${RAW_PATH}`);
console.log(`Headless: ${HEADLESS}`);
console.log(`Auth source: ${authSource}`);
