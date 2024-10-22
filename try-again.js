const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

// Use the stealth plugin to bypass detection
puppeteer.use(StealthPlugin());

// Function to create CSV string from reviews
function createCsvString(reviews) {
  const headers = [
    "Author Name",
    "Review Title",
    "Author Profile",
    "Author Position",
    "Company Size",
    "Review Tags",
    "Review Date",
    "Star Rating",
    "Likes",
    "Dislikes",
  ];
  const csvRows = [headers];

  reviews.forEach((review) => {
    const cleanReviewLikes = review.reviewLikes
      .replace(/\n/g, " ")
      .replace(/,/g, ";");
    const cleanReviewDislikes = review.reviewDislikes
      .replace(/\n/g, " ")
      .replace(/,/g, ";");

    csvRows.push([
      review.authorName || "",
      review.reviewTitle || "",
      review.authorProfile || "",
      review.authorPosition || "",
      review.authorCompanySize || "",
      review.reviewTags || "",
      review.reviewDate || "",
      review.reviewRate || "",
      cleanReviewLikes || "",
      cleanReviewDislikes || "",
    ]);
  });

  return csvRows.map((row) => row.join(",")).join("\n");
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Set true for headless operation
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

  await page.setViewport({ width: 1280, height: 800 });

  // Set a common User-Agent to mimic real browsing
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://example.com",
    Connection: "keep-alive",
  });

  console.log("Navigating to the reviews page...");
  await page.goto("https://www.g2.com/products/intercom/reviews?page=1", {
    timeout: 150000,
  });

  // Wait for reviews container
  await page.waitForSelector('div[id="reviews"]', { timeout: 200000 });

  console.log("Taking a screenshot for debugging...");
  await page.screenshot({ path: "debug-again.png", fullPage: true });

  await autoScroll(page);

  // Extract content from the page
  const content = await page.content();
  const $ = cheerio.load(content);

  let reviewsArray = [];

  // Extract reviews from the page
  $('div[id="reviews"] > div').each((_, review) => {
    const authorName =
      $(review).find('span[itemprop="author"] meta').first().attr("content") ||
      "N/A";
    const reviewTitle =
      $(review).find('div[itemprop="name"]').text().trim() || "N/A";
    const authorProfile = $(review)
      .find('span[itemprop="author"] meta')
      .eq(1)
      .attr("content");
    const authorPosition = $(review).find(".mt-4th").text().trim();
    const authorCompanySize = $(review)
      .find('div:contains("Business") span')
      .text()
      .trim();

    const reviewTags = $(review)
      .find("div.tags div div, div.tags div")
      .map((_, el) => $(el).text().trim())
      .get();
    const reviewDate = $(review)
      .find('meta[itemprop="datePublished"]')
      .attr("content");

    const starsClass = $(review).find(".stars").attr("class");
    const reviewRate = starsClass
      ? parseFloat(starsClass.split("stars-")[1]) / 2
      : null;

    const reviewLikes = $(review)
      .find('div[itemprop="reviewBody"] div div p')
      .first()
      .text();
    const reviewDislikes = $(review)
      .find('div[itemprop="reviewBody"] div div p')
      .eq(1)
      .text();

    reviewsArray.push({
      authorName,
      reviewTitle,
      authorProfile,
      authorPosition,
      authorCompanySize,
      reviewTags: reviewTags.join(", "),
      reviewDate,
      reviewRate,
      reviewLikes,
      reviewDislikes,
    });
  });

  console.log("Extracted Reviews:", reviewsArray);

  // Create CSV string
  const csvString = createCsvString(reviewsArray);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `reviews_${timestamp}.csv`;

  // Save to file
  fs.writeFileSync(filename, csvString);
  console.log(`Reviews saved to ${filename}`);

  // Log the first few reviews
  console.log("First few reviews:", reviewsArray.slice(0, 3));

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
