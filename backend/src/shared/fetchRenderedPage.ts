import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { DEFAULT_USER_AGENT } from "./fetchPage.js";

const GOTO_TIMEOUT_MS = 25_000;
const READY_TIMEOUT_MS = 12_000;
const LOAD_MORE_CLICKS = 8;

const READY_SELECTORS = [
  '#js-product-list[data-ready="true"]',
  "#load-list .product-card",
  ".product-card",
  '[data-ready="true"]',
].join(", ");

export async function fetchRenderedPage(url: string): Promise<string> {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.env.HOME ??= "/tmp";
  }

  chromium.setGraphicsMode = false;

  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ?? (await chromium.executablePath());

  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({
      args: chromium.args,
      headless: "shell",
    }),
    defaultViewport: { width: 1280, height: 800 },
    executablePath,
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: GOTO_TIMEOUT_MS,
    });

    await page
      .waitForSelector(READY_SELECTORS, { timeout: READY_TIMEOUT_MS })
      .catch(() => undefined);

    for (let i = 0; i < LOAD_MORE_CLICKS; i++) {
      const clicked = await page.evaluate(() => {
        const byId = document.getElementById(
          "load-more-btn",
        ) as HTMLButtonElement | null;
        if (!byId || byId.disabled) return false;
        byId.click();
        return true;
      });
      if (!clicked) break;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    await page
      .waitForFunction(
        () =>
          document.querySelector('[data-complete="true"]') != null ||
          document.querySelector("#load-more-btn:disabled") != null,
        { timeout: 4_000 },
      )
      .catch(() => undefined);

    return await page.content();
  } finally {
    await browser.close();
  }
}
