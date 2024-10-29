const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { getSubtitles } = require('youtube-captions-scraper');
// const { getSubtitles } = require('./scrapper.js');
const randomUserAgent = require('random-useragent');
const axios = require('axios');

const { HttpsProxyAgent } = require('https-proxy-agent');


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

// Создаем строку прокси-URL с аутентификацией
const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
const agent = new HttpsProxyAgent(proxyUrl);

// Устанавливаем надежный User-Agent вручную
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

// Создаем экземпляр axios с прокси-настройками и дополнительными заголовками
const axiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'User-Agent': userAgent,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Referer': 'https://www.google.com/',
  },
  timeout: 10000, // Таймаут для предотвращения зависания
});


async function fetchSubtitlesAuto(videoId) {
  const languages = ['auto', 'pl', 'en', 'ru', 'es', 'fr', 'de', 'id'];
  let subtitles = null;

  for (const lang of languages) {
    try {
      subtitles = await getSubtitles({
        videoID: videoId,
        lang: lang,
        axiosInstance,
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

