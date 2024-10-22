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
  await page.waitForSelector('div[id="reviews"]', { timeout: 200000 });

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
      authorProfile,
      authorPosition,
      authorCompanySize,
      reviewTags: reviewTags.join(', '),
      reviewDate,
      reviewRate,
      reviewLikes,
      reviewDislikes
    });
  });

  console.log("Extracted Reviews:", reviewsArray);

  // Define CSV writer
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
      {id: 'reviewBody', title: 'Review Body'},
    ]
  });

  // Write data to CSV
  csvWriter.writeRecords(reviewsArray)
    .then(() => {
      console.log('CSV file written successfully');
    })
    .catch(err => {
      console.error('Error writing CSV file:', err);
    });

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
