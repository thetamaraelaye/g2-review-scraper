const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const dotenv = require("dotenv");
dotenv.config();

// Use the stealth plugin to bypass detection
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Use headless: true if you want it in the background
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--proxy-server=http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`,
    ],
  });

   

  const page = await browser.newPage();

   await page.authenticate({
     username: process.env.PROXY_USER,
     password: process.env.PROXY_PASS,
   }); 
   ;
  await page.setViewport({ width: 1280, height: 800 });

  // Set a common User-Agent to mimic a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://example.com",
    "Connection": "keep-alive",
  });

  console.log("Navigating to the reviews page...");
  await page.goto("https://www.g2.com/products/intercom/reviews?page=1", {
    timeout: 150000, // Ensure the network is idle
  });

  // Wait for the reviews container to appear
  await page.waitForSelector('div[id="reviews"]', { timeout: 120000 });

  console.log("Taking a screenshot for debugging...");
  await page.screenshot({ path: "debug-again.png", fullPage: true });

  // Scroll to ensure all reviews are loaded
  await autoScroll(page);

  // Extract the content of the page
  const content = await page.content();
  const $ = cheerio.load(content);

  let reviewsArray = [];

  // Confirm if the div with id "reviews" contains data
  $('div[id="reviews"] > div').each((_, review) => {
    const authorName =
      $(review).find('span[itemprop="author"] meta').first().attr("content") ||
      "N/A";
    const reviewTitle =
      $(review).find('div[itemprop="name"]').text().trim() || "N/A";

    

    reviewsArray.push({
      authorName,
      reviewTitle,
    });
  });

  console.log("Extracted Reviews:", reviewsArray);

  await browser.close();
})();

// Auto-scrolling function to load dynamic content
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 1000);
    });
  });
}
