// const express = require('express');
// const cors = require('cors');
// const puppeteer = require('puppeteer');
// // const { getSubtitles } = require('youtube-captions-scraper');
// const { getSubtitles } = require('./scrapper.js');
// const randomUserAgent = require('random-useragent');
// const axios = require('axios');



// const app = express();
// const port = process.env.PORT || 3000;

// app.use(express.json());
// app.use(cors());

// // Прокси-настройки
// const proxyHost = '93.190.142.57';
// const proxyPort = '9999';
// const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
// const proxyPassword = 'hsXWenfhfCjDwacq';

// // Настройка прокси через axios
// const axiosInstance = axios.create({
//   proxy: {
//     host: proxyHost,
//     port: parseInt(proxyPort),
//     auth: {
//       username: proxyUsername,
//       password: proxyPassword,
//     },
//   },
//   headers: {
//     'User-Agent': randomUserAgent.getRandom(),
//   },
// });

// // Маршрут для проверки IP
// app.get('/check-ip', async (req, res) => {
//   try {
//     const response = await axiosInstance.get('https://api.ipify.org?format=json');
//     res.json({ proxyIP: response.data.ip });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch IP through proxy', details: error.message });
//   }
// });

// async function fetchSubtitlesAuto(videoId) {
//   const languages = ['auto', 'pl', 'en', 'ru', 'es', 'fr', 'de', 'id'];
//   let subtitles = null;

//   for (const lang of languages) {
//     try {
//       subtitles = await getSubtitles({
//         videoID: videoId,
//         lang: lang,
//         axiosInstance,
//       });

//       if (subtitles && subtitles.length > 0) {
//         const formattedText = subtitles.map(sub => sub.text).join(' ');
//         return formattedText;
//       }
//     } catch (error) {
//       console.log(`Error fetching subtitles for video ${videoId} on language ${lang}: ${error.message}`);
//       continue;
//     }
//   }

//   return 'No subtitles available';
// }

// app.get('/', async (req, res) => {
//   res.json('ALIVE');
// });

// app.post('/captions', async (req, res) => {
//   const { videoIds } = req.body;

//   if (!Array.isArray(videoIds)) {
//     return res.status(400).json({ error: 'Invalid input. Expected an array of video IDs.' });
//   }

//   const results = await Promise.all(videoIds.map(async (id) => {
//     const subtitlesText = await fetchSubtitlesAuto(id);
//     return { videoId: id, subtitlesText };
//   }));

//   res.json(results);
// });

// app.listen(port, () => {
//   console.log(`Server running on http://195.161.68.104:49234`);
// });

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const randomUserAgent = require('random-useragent');

// Прокси-настройки
const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

// Создаем строку прокси-URL с аутентификацией
const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
const agent = new HttpsProxyAgent(proxyUrl);

// Создаем экземпляр axios с прокси-настройками
const axiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'User-Agent': randomUserAgent.getRandom(),
  },
  timeout: 10000, // Таймаут для предотвращения зависания
});

const test = async () => {
  const url = 'https://youtube.com/watch?v=tR47BnpvBOM';
  try {
    const response = await axiosInstance.get(url);
    console.log(response.data);
  } catch (error) {
    console.error(`Error fetching data from ${url}: ${error.message}`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
  }
};

test();