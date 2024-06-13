const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const cliProgress = require('cli-progress');
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const videoListFilePath = 'link.txt';
const outputDirectory = 'downloadedVideos';

if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
}

bulkDownloadFromFile(videoListFilePath, outputDirectory);

async function bulkDownloadFromFile(filePath, outputPath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const videoLinks = fileContent.split('\n').map(line => line.trim());

    console.log(`Total number of videos to process: \x1b[32m${videoLinks.length}\x1b[0m`);

    for (let i = 0; i < videoLinks.length; i++) {
      try {
        const info = await ytdl.getInfo(videoLinks[i]);
        const videoTitle = info.videoDetails.title.substring(0,60).replace(/[<>:"/\\|?*\x00-\x1F]/g, " - ");
        const videoStream = ytdl(videoLinks[i], { filter: 'audioandvideo' });
        const videoDuration = info.videoDetails.lengthSeconds;
        progressBar.start(100, 0);

        await new Promise((resolve, reject) => {
          const command = ffmpeg(videoStream)
          command
            .outputOptions('-c:v libx264')
            .outputOptions('-crf 20')
            .outputOptions('-preset ultrafast')
            .outputOptions('-maxrate 5000k')
            .outputOptions('-bufsize 5000k')
            .outputOptions('-pix_fmt yuv420p')
            .outputOptions('-movflags frag_keyframe+empty_moov')
            .outputOptions('-vf scale=720:1280')
            .output(`${outputPath}/${videoTitle}.mp4`)
            .on('progress', (progress) => {
              const currentTime = convertTimemarkToSeconds(progress.timemark);
              const percent = (currentTime / videoDuration) * 100;
              progressBar.update(Math.min(percent, 100));
            })
            .on('end', () => {
              progressBar.update(100);
              progressBar.stop();
              console.log(`Downloaded successfully video \x1b[32m${i + 1}\x1b[0m: ${videoTitle}`);
              resolve();
            })
            .on('error', (err) => {
              progressBar.stop();
              console.error(`Error processing video ${i + 1}:`, err);
              resolve(); // Move to the next video on error
            })
            .run();
        });
      } catch (err) {
        console.error(`Error downloading video ${i + 1}:`, err);
      }
    }

    console.log(`\x1b[32m${videoLinks.length}\x1b[0m videos have been downloaded.`);
    
    // Clear the content of the file after downloading all videos
    fs.writeFileSync(filePath, '');

    console.log(`Content of ${filePath} has been cleared.`);
  } catch (err) {
    console.error('Error reading file or downloading videos:', err);
  }
}

const progressBar = new cliProgress.SingleBar({
  format: '\x1b[33m' + 'Progressing |' + '{bar}' + '| {percentage}% || {value}/{total} Chunks',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  barsize: 30,
  barGlue: '\x1b[38;2;0;0;255m'
}, cliProgress.Presets.shades_classic);

function convertTimemarkToSeconds(timemark) {
  const parts = timemark.split(':');
  return (parseInt(parts[0]) * 6600) + (parseInt(parts[1]) * 60) + parseFloat(parts[2]);
}
