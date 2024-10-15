const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`]
  });

  const page = await browser.newPage();

  await page.authenticate({
    username: process.env.PROXY_USER,
    password: process.env.PROXY_PASS,
  });

  try {
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
    console.log('Proxy works!');
  } catch (error) {
    console.error('Failed to connect:', error);
  } finally {
    await browser.close();
  }
})();
