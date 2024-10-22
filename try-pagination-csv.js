const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const dotenv = require("dotenv");
const { timeout } = require("puppeteer");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
dotenv.config();

// Use the stealth plugin to bypass detection
puppeteer.use(StealthPlugin());

// Utility: Add a delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Set to true to run in background
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--proxy-server=http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`,
      '--disable-web-security',  // Disable some bot detection mechanisms
      '--disable-features=IsolateOrigins,site-per-process', // More bypass techniques
    ],
  });

  const page = await browser.newPage();

  await page.authenticate({
    username: process.env.PROXY_USER,
    password: process.env.PROXY_PASS,
  });

  await page.setViewport({ width: 1280, height: 800 });

  // Set User-Agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://example.com",
    "Connection": "keep-alive",
  });

  const reviewsArray = [];
  let pageNumber = 1;

  // Start from the first page
  await page.goto("https://www.g2.com/products/intercom/reviews", {
    timeout: 150000,
  });

  while (pageNumber <= 6) {
    console.log(`Extracting reviews from page ${pageNumber}...`);

    // Wait for the reviews container to appear
    await page.waitForSelector('div[id="reviews"]', { timeout: 1000000 });

    // Take a screenshot after the page loads
    await page.screenshot({ path: `page-${pageNumber}.png`, fullPage: true });

    // Scroll to ensure all reviews are loaded
    await autoScroll(page);

    // Extract reviews
    const content = await page.content();
    const $ = cheerio.load(content);

    $('div[id="reviews"] > div').each((_, review) => {
      const authorName = $(review).find('span[itemprop="author"] meta').first().attr("content") || "N/A";
      const reviewTitle = $(review).find('div[itemprop="name"]').text().trim() || "N/A";
      const reviewBody = $(review).find('div[itemprop="reviewBody"] div div p').text().trim() || "N/A";
      const authorProfile = $(review).find('span[itemprop="author"] meta').eq(1).attr('content');
      const authorPosition = $(review).find('.mt-4th').text().trim();
      const authorCompanySize = $(review).find('div:contains("Business") span').text().trim();

      const reviewTags = $(review).find('div.tags div div, div.tags div')
        .map((_, el) => $(el).text().trim())
        .get();

      const reviewDate = $(review).find('meta[itemprop="datePublished"]').attr('content');
      const starsElement = $(review).find('.stars');
      const starsClass = starsElement.attr('class');
      const reviewRate = starsClass ? parseFloat(starsClass.split('stars-')[1]) / 2 : null;
      const reviewLikes = $(review).find('div[itemprop="reviewBody"] div div p').first().text();
      const reviewDislikes = $(review).find('div[itemprop="reviewBody"] div div p').eq(1).text();

      reviewsArray.push({
        authorName,
        reviewTitle,
        reviewBody,
        authorProfile,
        authorPosition,
        authorCompanySize,
        reviewTags: reviewTags.join(', '),
        reviewDate,
        reviewRate,
        reviewLikes,
        reviewDislikes,
      });
    });

    console.log(`Extracted ${reviewsArray.length} reviews from page ${pageNumber}.`);

    // Check for and click the "Next" button
    const nextButtonSelector = 'li.pagination__component a.pagination__named-link.js-log-click.pjax';
    const nextButton = await page.$(nextButtonSelector)

    if (nextButton && pageNumber < 7) {
      await Promise.all([
        nextButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 200000 }),
      ]);
      pageNumber++;
      await delay(3000); 
    } else {
      console.log("Next button not found or reached the last page.");
      break;
    }
  }

  // Write extracted reviews to CSV
  const csvWriter = createCsvWriter({
    path: 'reviews.csv',
    header: [
      { id: 'authorName', title: 'Author Name' },
      { id: 'reviewTitle', title: 'Review Title' },
      { id: 'authorProfile', title: 'Author Profile' },
      { id: 'authorPosition', title: 'Author Position' },
      { id: 'authorCompanySize', title: 'Author Company Size' },
      { id: 'reviewTags', title: 'Review Tags' },
      { id: 'reviewDate', title: 'Review Date' },
      { id: 'reviewRate', title: 'Review Rate' },
      { id: 'reviewLikes', title: 'Review Likes' },
      { id: 'reviewDislikes', title: 'Review Dislikes' },
    ],
  });

  await csvWriter.writeRecords(reviewsArray);
  console.log('CSV file written successfully.');

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
