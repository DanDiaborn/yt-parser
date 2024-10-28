const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const randomUserAgent = require('random-useragent');

const app = express();
const port = process.env.PORT || 3000;

// Proxy credentials
const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

app.use(express.json());
app.use(cors());

const getInstagramPostData = async (shortcode) => {
  const url = `https://www.instagram.com/p/${shortcode}/?rnd=${Math.random().toString(36).substr(2, 5)}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=http://${proxyHost}:${proxyPort}`
    ],
    executablePath: puppeteer.executablePath()
  });

  const page = await browser.newPage();
  const userAgent = randomUserAgent.getRandom();
  await page.setUserAgent(userAgent);
  await page.deleteCookie(...(await page.cookies()));

  // Auth for proxy
  await page.authenticate({ username: proxyUsername, password: proxyPassword });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const postData = await page.evaluate(() => {
      const getElementContent = (selector, attribute) => {
        const element = document.querySelector(selector);
        return element ? element.getAttribute(attribute) : null;
      };

      const titleMatch = getElementContent('meta[property="og:title"]', 'content') || 'Title not available';
      const title = titleMatch.replace(/^.*?:\s*/, '');
      const info = getElementContent('meta[property="og:description"]', 'content') || 'Description not available';

      const likesMatch = info.match(/(\d+K?) likes/);
      const likes = likesMatch ? likesMatch[1] : null;

      const commentsMatch = info.match(/(\d+) comments/);
      const comments = commentsMatch ? commentsMatch[1] : null;

      const dateMatch = info.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
      const date = dateMatch ? dateMatch[1] : null;

      return { title, likes, comments, date };
    });

    await browser.close();
    return postData;
  } catch (error) {
    console.error('Ошибка:', error.message);
    await browser.close();
    return null;
  }
};

const randomTimeout = (min = 500, max = 1500) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

app.get('/', async (req, res) => {
  res.json('ALIVE');
});

app.post('/inst', async (req, res) => {
  const { postsIds } = req.body;
  if (!Array.isArray(postsIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of post IDs.' });
  }

  const results = await Promise.all(postsIds.map(async (id) => {
    await randomTimeout();
    const postInfo = await getInstagramPostData(id);
    return { videoId: id, postInfo };
  }));

  res.json(results);
});

app.listen(port, () => {
  console.log(`Server running on http://195.161.68.104:49234`);
});
