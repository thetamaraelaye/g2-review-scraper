Here’s a detailed **README** for your G2 review scraper project.

---

# **G2 Review Scraper Using Puppeteer and Node.js**

## **Overview**
This project demonstrates how to scrape product reviews from G2 using Puppeteer, The Social Proxy’s residential proxies, and Node.js. The scraped reviews are saved in a **CSV** file for easy analysis.

## **Features**
- Extracts review data such as author name, position, rating, date, and review title.
- Supports **pagination** to scrape multiple pages of reviews.
- Uses **residential proxies** to avoid IP-based blocking.
- Saves reviews in a **CSV file** for structured data access.

---

## **Prerequisites**
- Node.js and Yarn installed on your system.
- A proxy service account (e.g., The Social Proxy) to authenticate your scraper.
- Basic knowledge of JavaScript and web scraping.

---

## **Installation**

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd g2-review-scraper
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Create a `.env` file:**
   ```bash
   touch .env
   ```

4. **Add proxy credentials to `.env`:**
   ```
   PROXY_HOST=your-proxy-host
   PROXY_PORT=your-proxy-port
   PROXY_USER=your-proxy-username
   PROXY_PASS=your-proxy-password
   ```

---

## **Usage**

1. **Update the target URL:**
   In `index.js`, replace the `url` variable with the G2 product page URL you want to scrape.
   ```javascript
   const url = 'https://www.g2.com/products/intercom/reviews';
   ```

2. **Run the scraper:**
   ```bash
   node index.js
   ```

3. **View the output:**
   - The scraped reviews will be saved in a file named `g2_reviews.csv` in the project directory.
   - Check the console for progress and error logs.

---

## **Project Structure**
```
g2-review-scraper/
│
├── index.js         # Main entry point for the scraper
├── package.json     # Project configuration and dependencies
├── .env             # Environment variables (proxy credentials)
├── g2_reviews.csv   # Output CSV file with scraped reviews
└── README.md        # Documentation for the project
```

---

## **Code Overview**

1. **Launch Browser with Proxy**:  
   Sets up a browser session using Puppeteer with proxy authentication.

2. **Extract Reviews**:  
   Uses Cheerio to parse HTML and extract key review information.

3. **Handle Pagination**:  
   Iterates through multiple review pages to collect all data.

4. **Save to CSV**:  
   Writes the scraped reviews into a structured CSV file.

---

## **Error Handling**
- If scraping fails, the error will be logged to the console.
- Ensure the target product page URL is correct.
- Check if your proxy credentials are valid in the `.env` file.

---

## **Dependencies**
- **Puppeteer**: Browser automation.
- **Cheerio**: HTML parsing and scraping.
- **CSV-Writer**: Exporting data to CSV.
- **Dotenv**: Managing environment variables.

Install all dependencies using:
```bash
yarn install
```

---

## **Troubleshooting**
- **Timeout Issues**:  
  Increase the `timeout` parameter in the Puppeteer launch settings:
  ```javascript
  timeout: 120000, // 2 minutes
  ```

- **Blocked Access**:  
  Ensure your proxy service is correctly configured in `.env`.

- **Empty CSV**:  
  Double-check the page structure with Cheerio selectors to ensure the correct elements are targeted.

---

## **License**
This project is licensed under the MIT License.

---

## **Contributing**
Feel free to fork this project and submit pull requests if you find ways to improve it!

---

## **Contact**
If you have any questions or encounter any issues, please contact [Your Name or Email]. 

---

This README provides everything you need to understand, run, and troubleshoot your G2 scraper project. Let me know if you need additional changes!