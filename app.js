const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { getSubtitles } = require('youtube-captions-scraper');
const randomUserAgent = require('random-useragent');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Прокси-настройки
const proxyConfig = {
  host: '37.252.11.249',
  port: 8080, // порт прокси
  auth: {
    username: 'dansher250@gmail.com', // замените на ваше имя пользователя прокси, если требуется
    password: 'pockemon250', // замените на ваш пароль прокси, если требуется
  },
};

// Функция для получения субтитров с прокси
async function fetchSubtitlesAuto(videoId) {
  const languages = ['auto', 'en', 'ru', 'es', 'fr', 'de', 'id'];
  let subtitles = null;

  for (const lang of languages) {
    try {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: lang,
        axiosInstance: axios.create({
          proxy: proxyConfig,
          headers: {
            'User-Agent': randomUserAgent.getRandom(),
          },
        }),
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

app.get('/', async (req, res) => {
  res.json('ALIVE');
});

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
  console.log(`Server running on http://195.161.68.104:49234`);
});
