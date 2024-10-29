/* @flow */

const he = require('he');
const { find } = require('lodash');
const striptags = require('striptags');

// Используем `axiosInstance` для запросов с прокси и пользовательскими заголовками
const fetchData = async (url, axiosInstance) => {
  const { data } = await axiosInstance.get(url);
  return data;
};

async function getSubtitles({
  videoID,
  lang = 'en',
  axiosInstance,
}) {
  if (!axiosInstance) {
    throw new Error("axiosInstance is required for getSubtitles.");
  }

  const data = await fetchData(
    `https://youtube.com/watch?v=${videoID}`,
    axiosInstance
  );

  // Убедимся, что мы имеем доступ к данным субтитров
  if (!data.includes('captionTracks')) {
    throw new Error(`Could not find captions for video: ${videoID}`);
  }

  const regex = /"captionTracks":(\[.*?\])/;
  const [match] = regex.exec(data);

  const { captionTracks } = JSON.parse(`{${match}}`);
  const subtitle =
    find(captionTracks, { vssId: `.${lang}` }) ||
    find(captionTracks, { vssId: `a.${lang}` }) ||
    find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

  // Убедимся, что нашли нужный язык субтитров
  if (!subtitle || !subtitle.baseUrl) {
    throw new Error(`Could not find ${lang} captions for ${videoID}`);
  }

  const transcript = await fetchData(subtitle.baseUrl, axiosInstance);
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
