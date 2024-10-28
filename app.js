const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const randomUserAgent = require('random-useragent');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Прокси-настройки
const proxyHost = '93.190.142.57';
const proxyPort = '9999';
const proxyUsername = 'ihu31wfnsg-corp-country-PL-state-858787-city-756135-hold-session-session-671faadc61892';
const proxyPassword = 'hsXWenfhfCjDwacq';

// Создание прокси-агента через HttpsProxyAgent
const proxyAgent = new HttpsProxyAgent(`http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`);

// Настройка axios с использованием прокси-агента
const axiosInstance = axios.create({
  httpsAgent: proxyAgent,
  headers: {
    'User-Agent': randomUserAgent.getRandom(),
  },
});

// Маршрут для тестового запроса к SWAPI
app.get('/test-swapi', async (req, res) => {
  try {
    const response = await axiosInstance.get('https://swapi.dev/api/people/1/');
    res.json({ swapiData: response.data });
  } catch (error) {
    console.log(`Error fetching SWAPI data: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch SWAPI data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://195.161.68.104:${port}`);
});
