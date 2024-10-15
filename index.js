const dotenv = require('dotenv');
dotenv.config();
// require('dotenv').config(); // Load environment variables
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// CSV Writer Configuration
const csvWriter = createCsvWriter({
  path: 'g2_reviews.csv',
  header: [
    { id: 'authorName', title: 'Author Name' },
    { id: 'authorProfile', title: 'Author Profile' },
    { id: 'authorPosition', title: 'Author Position' },
    { id: 'authorCompanySize', title: 'Author Company Size' },
    { id: 'reviewTags', title: 'Review Tags' },
    { id: 'reviewDate', title: 'Review Date' },
    { id: 'reviewRate', title: 'Rating' },
    { id: 'reviewTitle', title: 'Title' },
    { id: 'reviewLikes', title: 'Likes' },
    { id: 'reviewDislikes', title: 'Dislikes' },
  ],
});

// Proxy Configuration

// const PROXY = `http://${process.env.PROXY_USER}:${process.env.PROXY_PASS}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`

// console.log(PROXY)

// Function to Launch Puppeteer with Proxy
async function launchBrowser() {
  return await puppeteer.launch({
    args: [`--proxy-server=${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`, ],
    headless: true,
    timeout: 90000,
  });
}

// Function to Extract Data from Each Review Page
async function extractReviewsFromPage(page) {
  console.log("page", page)
  const content = await page.content(); // Get HTML of the page
  console.log("content", content);
  const $ = cheerio.load(content); // Load HTML into Cheerio

  let reviews = [];
  $('div[id="reviews"]').each((_, reviews) => {
    console.log("all review",reviews, )
    // const authorName = $(review).find('span[itemprop="author"] meta').first().attr('content');
    // console.log(authorName)
    // const authorProfile = $(review).find('span[itemprop="author"] meta').eq(1).attr('content');
    // const authorPosition = $(review).find('.mt-4th').text().trim();
    // const authorCompanySize = $(review).find('div:contains("Business") span').text().trim();

    // const reviewTags = $(review).find('div.tags div div, div.tags div')
    //   .map((_, el) => $(el).text().trim())
    //   .get();
    // const reviewDate = $(review).find('meta[itemprop="datePublished"]').attr('content');
    // const reviewRate = parseFloat($(review).find('.stars').attr('class').split('stars-')[1]) / 2 || null;
    // const reviewTitle = $(review).find('h3[itemprop="name"]').text().replace('"', '');
    // const reviewLikes = $(review).find('div[itemprop="reviewBody"] div div p').first().text();
    // const reviewDislikes = $(review).find('div[itemprop="reviewBody"] div div p').eq(1).text();

    // reviews.push({
    //   authorName,
    //   authorProfile,
    //   authorPosition,
    //   authorCompanySize,
    //   reviewTags: reviewTags.join(', '),
    //   reviewDate,
    //   reviewRate,
    //   reviewTitle,
    //   reviewLikes,
    //   reviewDislikes,
    // });
  });

  return reviews;
}

// Main Scraper Function
async function scrapeG2Reviews() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.authenticate({
    username: process.env.PROXY_USER,
    password: process.env.PROXY_PASS,
  })

  // Open the G2 product review page (e.g., Intercom reviews)
  const url = 'https://www.g2.com/products/intercom/reviews'; // Replace with the target G2 review page
  let allReviews = [];

  for (let i = 1; i <= 6; i++) {
    console.log(`Scraping page ${i}...`);
    await page.goto(`${url}?page=${i}`, { waitUntil: 'networkidle0', timeout: 90000 }); // Handle pagination
    const reviews = await extractReviewsFromPage(page);
    console.log("reviews", reviews)
    allReviews = allReviews.concat(reviews); // Accumulate reviews
  }

  await browser.close();
  console.log(`Scraped ${allReviews.length} reviews.`);
  
  // Save data to CSV
  await csvWriter.writeRecords(allReviews);
  console.log('Saved reviews to g2_reviews.csv');
}

// Run the scraper
scrapeG2Reviews()
  .then(() => console.log('Scraping completed successfully!'))
  .catch((err) => console.error('Error:', err));
