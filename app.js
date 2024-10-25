const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { getSubtitles } = require('youtube-captions-scraper');
const randomUserAgent = require('random-useragent');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getInstagramPostData = async (shortcode) => {
  const url = `https://www.instagram.com/p/${shortcode}/`;
  const userAgent = randomUserAgent.getRandom();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Устанавливаем динамический User-Agent
  await page.setUserAgent(userAgent);

  try {
    await delay(Math.floor(Math.random() * 5000) + 1000); // случайная пауза от 1 до 5 секунд
    await page.goto(url, { waitUntil: 'networkidle2' });

    const postData = await page.evaluate(() => {
      const title = document.querySelector('meta[property="og:description"]').getAttribute('content');
      const date = document.querySelector('time').getAttribute('datetime');
      return { title, date };
    });

    console.log(`Название поста: ${postData.title}`);
    console.log(`Дата публикации: ${postData.date}`);

    await browser.close();
    return postData;
  } catch (error) {
    console.error('Ошибка:', error.message);
    await browser.close();
    return null;
  }
};

app.post('/inst', async (req, res) => {
  const { postsIds } = req.body;
  if (!Array.isArray(postsIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of post IDs.' });
  }

  const results = await Promise.all(postsIds.map(async (id) => {
    await delay(Math.floor(Math.random() * 3000) + 500); // случайная пауза от 0.5 до 3 секунд перед каждым запросом
    const postInfo = await getInstagramPostData(id);
    return { videoId: id, postInfo };
  }));

  res.json(results);
});

app.get('/', async (req, res) => {
  res.json('ALIVE');
});

// Пример для поста субтитров
app.post('/captions', async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds)) {
    return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
  }

  const results = await Promise.all(videoIds.map(async (id) => {
    const subtitlesText = await fetchSubtitlesAuto(id);
    return { videoId: id, subtitlesText };
  }));

  res.json(results);
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
