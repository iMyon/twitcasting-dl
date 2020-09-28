const cheerio = require('cheerio');
const axios = require('axios');
const day = require('dayjs');
const {spawn} = require('child_process');
const {unlink, renameSync} = require('fs');

class TwitcastingDownloader {
  static async download (url) {
    const result = await axios.get(url);
    const $ = cheerio.load(result.data);
    const startTime = $('.tw-player-meta__status_item time').attr('datetime');
    const title = day(startTime).format('YYYY-MM-DD HHmmss ') + $('#movie_title_content').text().replace(/(\\|\/|:|\*|"|<|>|\t|\r|\n)/g, '');
    const playList = JSON.parse($('#player').attr('data-movie-playlist'));
    for (let i in playList) {
      const filename = `${title} p${~~i+1}.mp4`;
      console.log(`Downloading file: ${filename}`);
      console.log(`Network url：${playList[i].source.url}`);
      // 下载
      await downloadM3u8(playList[i].source.url, filename);
      // 重建头部时间flag
      await moveMoovToBegin(filename);
      console.log(`Downloaded: ${filename}`);
    }
  }
}

function downloadM3u8 (url, filename) {
  const args = [
    // '-reconnect', 1, '-reconnect_at_eof', 1, '-reconnect_streamed', 1, '-reconnect_delay_max', 2,
    '-i',  url, '-c', 'copy', filename]
  const ffmpeg = spawn('ffmpeg', args, {stdio: [ 'ignore', 1, 2 ]});
  ffmpeg.on('exit', () => {
    console.log('ffmpeg exit')
  });
  // ffmpeg.stdout.pipe(process.stdout);
  return new Promise(resolve => ffmpeg.once('close', (code) => {
    resolve(code === 0)
  }))
}

function moveMoovToBegin (outputPath) {
  console.log('😈 Repairing movflags...')
  const tmpFile = outputPath.replace(/^(.*)(\.[^\.]+)$/, '$1.tmp$2');
  // 使用fragment形式存储，并将moov移动到文件开头
  const args = ['-i',  outputPath, '-c', 'copy', '-movflags', 'faststart', tmpFile]
  const ffmpeg = spawn('ffmpeg', args, {stdio: [ 'ignore', 1, 2 ]});
  ffmpeg.on('exit', () => {
    console.log('ffmpeg(moov) exit')
  });
  return new Promise(resolve => ffmpeg.once('close', (code) => {
    unlink(outputPath, (err) => {
      console.log(err || `😈 File Deleted: ${outputPath}`)
      if (!err) {
        console.log(`Renaming temp file: ${tmpFile}`);
        renameSync(tmpFile, outputPath);
        console.log(`Renamed: ${outputPath}`);
      }
      resolve(code === 0)
    })
  }))
}

module.exports = {TwitcastingDownloader, moveMoovToBegin};
