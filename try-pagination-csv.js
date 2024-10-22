const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

puppeteer.use(StealthPlugin());

const filename = "g2_reviews.csv";

// Function to create CSV string from reviews
function createCsvString(reviews) {
  const headers = [
    "Reviewer Name",
    "Review Title",
    "Review Date",
    "Star Rating",
    "Review Likes",
    "Review Dislikes",
  ];
  const csvRows = [headers];

  reviews.forEach((review) => {
    const cleanLikes = review.reviewLikes
      .replace(/\n/g, " ")
      .replace(/,/g, ";");
    const cleanDislikes = review.reviewDislikes
      .replace(/\n/g, " ")
      .replace(/,/g, ";");

    csvRows.push([
      review.authorName || "",
      review.reviewTitle || "",
      review.reviewDate || "",
      review.reviewRate || "",
      cleanLikes || "",
      cleanDislikes || "",
    ]);
  });

  return csvRows.map((row) => row.join(",")).join("\n");
}

// Function to implement a natural scrolling effect
async function naturalScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100 + Math.random() * 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 500 + Math.random() * 500);
    });
  });
}

// Function to add a delay
function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Main function with pagination logic
(async () => {
  const browser = await puppeteer.launch({
    headless: true, // Set to false if you want to watch the browser during scraping
    args: [
      `--proxy-server=${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.authenticate({
    username: process.env.PROXY_USER,
    password: process.env.PROXY_PASS,
  });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://www.g2.com/products/intercom",
    Connection: "keep-alive",
  });

  let allReviews = [];

  for (let i = 1; i <= 6; i++) {
    const url = `https://www.g2.com/products/intercom/reviews?page=${i}`;
    console.log(`Navigating to ${url}...`);

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      await page.waitForSelector('div[id="reviews"]', { timeout: 30000 });
      console.log(`Extracting reviews from page ${i}...`);

      await naturalScroll(page);

      const content = await page.content();
      const $ = cheerio.load(content);

      $('div[id="reviews"] > div').each((_, review) => {
        const authorName =
          $(review)
            .find('span[itemprop="author"] meta')
            .first()
            .attr("content") || "N/A";
        const reviewTitle =
          $(review).find('div[itemprop="name"]').text().trim() || "N/A";
        const reviewDate =
          $(review).find('meta[itemprop="datePublished"]').attr("content") ||
          "N/A";
        const starsClass = $(review).find(".stars").attr("class");
        const reviewRate = starsClass
          ? parseFloat(starsClass.split("stars-")[1]) / 2
          : "N/A";
        const reviewLikes =
          $(review)
            .find('div[itemprop="reviewBody"] div div p')
            .first()
            .text() || "";
        const reviewDislikes =
          $(review).find('div[itemprop="reviewBody"] div div p').eq(1).text() ||
          "";

        allReviews.push({
          
          authorName,
          reviewTitle,
          reviewDate,
          reviewRate,
          reviewLikes,
          reviewDislikes,
        });
      });

      console.log(`Extracted ${allReviews.length} reviews so far...`);

      await delay(3000 + Math.floor(Math.random() * 2000));
    } catch (error) {
      console.error(`Failed to extract reviews from page ${i}:`, error);
    }
  }

  const csvString = createCsvString(allReviews);
  fs.writeFileSync(filename, csvString);
  console.log(`Reviews saved to ${filename}`);

  console.log("First few reviews:", allReviews.slice(0, 3));
  await browser.close();
})();
