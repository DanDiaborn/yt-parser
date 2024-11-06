const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

ffmpeg('https://kinescope.io/bfa54442-0fdb-4e4f-a544-9d523ec05433/master.m3u8?expires=1730971940&amp;token=')
  .output('./aaa.mp3')
  .audioBitrate(8)
  .audioChannels(1)
  .audioFrequency(8000)
  .noVideo()
  .on('progress', (progress) => {
    if (progress.percent !== undefined) {
      console.log(`Скачано: ${progress.percent.toFixed(2)}%`);
    } else {
      console.log('Загрузка продолжается...');
    }
  })
  .on('end', () => {
    console.log('Скачивание аудио завершено!');
  })
  .on('error', (err) => {
    console.error('Ошибка при скачивании аудио:', err);
  })
  .run();