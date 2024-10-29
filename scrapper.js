/* @flow */

const axios = require('axios');

const fetchData =
  typeof fetch === 'function'
    ? async function fetchData(url) {
      try {
        const response = await fetch(url);
        return await response.text();
      } catch (error) {
        console.error(`Error fetching data from ${url}: ${error.message}`, JSON.stringify(error, null, 2), error.stack);
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    }
    : async function fetchData(url) {
      try {
        const { data } = await axios.get(url, {
          headers: { 'User-Agent': randomUserAgent.getRandom() },
          timeout: 10000, // Устанавливаем тайм-аут на 10 секунд
          family: 4 // Принудительно используем IPv4
        });
        return data;
      } catch (error) {
        console.error(`Error fetching data from ${url}: ${error.message}`, JSON.stringify(error, null, 2), error.stack);
        throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
      }
    };


async function getSubtitles({
  videoID,
  lang = 'en',
}) {
  let data;
  try {
    data = await fetchData(
      `https://youtube.com/watch?v=${videoID}`
    );
  } catch (error) {
    console.error(`Failed to fetch video data for ${videoID}: ${error.message}`, JSON.stringify(error, null, 2), error.stack);
    throw new Error(`Failed to fetch video data for ${videoID}: ${error.message}`);
  }

  // * ensure we have access to captions data
  if (!data.includes('captionTracks'))
    throw new Error(`Could not find captions for video: ${videoID}`);

  const regex = /"captionTracks":(\[.*?\])/;
  const [match] = regex.exec(data);

  let captionTracks;
  try {
    captionTracks = JSON.parse(`{${match}}`).captionTracks;
  } catch (error) {
    console.error(`Failed to parse caption tracks for video: ${videoID}. Error: ${error.message}`, JSON.stringify(error, null, 2), error.stack);
    throw new Error(`Failed to parse caption tracks for video: ${videoID}. Error: ${error.message}`);
  }

  const subtitle =
    find(captionTracks, {
      vssId: `.${lang}`,
    }) ||
    find(captionTracks, {
      vssId: `a.${lang}`,
    }) ||
    find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

  // * ensure we have found the correct subtitle lang
  if (!subtitle || (subtitle && !subtitle.baseUrl))
    throw new Error(`Could not find ${lang} captions for ${videoID}`);

  let transcript;
  try {
    transcript = await fetchData(subtitle.baseUrl);
  } catch (error) {
    console.error(`Failed to fetch subtitle data for ${videoID} in ${lang}: ${error.message}`, JSON.stringify(error, null, 2), error.stack);
    throw new Error(`Failed to fetch subtitle data for ${videoID} in ${lang}: ${error.message}`);
  }

  const lines = transcript
    .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
    .replace('</transcript>', '')
    .split('</text>')
    .filter(line => line && line.trim())
    .map(line => {
      const startRegex = /start="([\d.]+)"/;
      const durRegex = /dur="([\d.]+)"/;

      const [, start] = startRegex.exec(line) || [];
      const [, dur] = durRegex.exec(line) || [];

      const htmlText = line
        .replace(/<text.+>/, '')
        .replace(/&amp;/gi, '&')
        .replace(/<\/?[^>]+(>|$)/g, '');

      const decodedText = he.decode(htmlText);
      const text = striptags(decodedText);

      return {
        start,
        dur,
        text,
      };
    });

  return lines;
}

module.exports = { getSubtitles };
