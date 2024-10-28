const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { getSubtitles } = require('youtube-captions-scraper');
const randomUserAgent = require('random-useragent');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

async function fetchSubtitlesAuto(videoId) {
  const languages = ['auto', 'en', 'ru', 'es', 'fr', 'de', 'id'];
  let subtitles = null;

  for (const lang of languages) {
    try {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: lang,
      });
      if (subtitles && subtitles.length > 0) {
        const formattedText = subtitles.map(sub => sub.text).join(' ');
        return formattedText;
      }
    } catch (error) {
      console.log(`Error fetching subtitles for video ${videoId} on language ${lang}: ${error.message}`);
      continue;
    }
  }

  return 'No subtitles available';
}

const getInstagramPostData = async (shortcode) => {
  const url = `https://www.instagram.com/p/${shortcode}/?rnd=${Math.random().toString(36).substr(2, 5)}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: puppeteer.executablePath()
  });

  const page = await browser.newPage();
  const userAgent = randomUserAgent.getRandom();
  await page.setUserAgent(userAgent);
  await page.deleteCookie(...(await page.cookies()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Периодическое ожидание для проверки наличия данных
    const postData = await page.evaluate(() => {
      const getElementContent = (selector, attribute) => {
        const element = document.querySelector(selector);
        return element ? element.getAttribute(attribute) : null;
      };

      const titleMatch = getElementContent('meta[property="og:title"]', 'content') || 'Title not available';
      const title = titleMatch.replace(/^.*?:\s*/, '')
      const info = getElementContent('meta[property="og:description"]', 'content') || 'Description not available';

      const likesMatch = info.match(/(\d+K?) likes/);
      const likes = likesMatch ? likesMatch[1] : null;

      // Регулярное выражение для извлечения числа комментариев
      const commentsMatch = info.match(/(\d+) comments/);
      const comments = commentsMatch ? commentsMatch[1] : null;

      // Регулярное выражение для извлечения даты (формат: месяц день, год)
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
  //   {"postsIds":[
  // "DBhh5g4TqUa","DBh0_aayF5i","C9JfE2jyMmN"
  // ]}
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

app.post('/captions', async (req, res) => {
  // {
  //   "videoIds": [
  //     "tR47BnpvBOM", "sbMOkHeGcug"]
  // }
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
  console.log(`Server running on http://195.161.68.104:49234`);
});

// const express = require('express');
// const app = express();

// const PORT = process.env.PORT || 3000;

// app.get('/', (req, res) => {
//   res.send('Server is running!');
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on http://195.161.68.104:49234`);
// });