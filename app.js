const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const setting = require('./setting.json');
const cliProgress = require('cli-progress');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const readline = require('readline');

ffmpeg.setFfprobePath(ffprobeInstaller.path);
ffmpeg.setFfmpegPath(ffmpegPath);

// setting configuration
const rawVideoDirectory = './rawVideos';
// const editedVideoDirectory = './editedVideos';
let editedVideoDirectory;
const startTime = setting.startTime;
const duration = setting.video_duration;
const contrast = setting.contrast;
const speed = setting.video_speed;
const saturation = setting.saturation;
const rotation = setting.video_rotation;
const crop = setting.crop_size;
const delayBetweenEdits = 3000;
const frame_1080p = setting.frame_1080p;
const frame_720p = setting.frame_720p;
const frame_480p = setting.frame_480p;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// if (!fs.existsSync(editedVideoDirectory)) {
//     fs.mkdirSync(editedVideoDirectory);
// }

console.log(`\x1b[32m
███████╗██████╗░██╗████████╗  ██╗░░░██╗██╗██████╗░███████╗░█████╗░
██╔════╝██╔══██╗██║╚══██╔══╝  ██║░░░██║██║██╔══██╗██╔════╝██╔══██╗
█████╗░░██║░░██║██║░░░██║░░░  ╚██╗░██╔╝██║██║░░██║█████╗░░██║░░██║
██╔══╝░░██║░░██║██║░░░██║░░░  ░╚████╔╝░██║██║░░██║██╔══╝░░██║░░██║
███████╗██████╔╝██║░░░██║░░░  ░░╚██╔╝░░██║██████╔╝███████╗╚█████╔╝
╚══════╝╚═════╝░╚═╝░░░╚═╝░░░  ░░░╚═╝░░░╚═╝╚═════╝░╚══════╝░╚════╝░\x1b[0m
\x1b[33m Develop by THAN VICHEAKA\x1b[0m
`);

// rl.question('Enter the videos directory path: ', (rawVideoDirectory) => {
//     rl.close();

//     rawVideoDirectory = rawVideoDirectory.trim();
//     executeScript();
// });

rl.question('Enter the output directory path: ', (outputDirectory) => {
    rl.close();

    editedVideoDirectory = outputDirectory.trim();
    executeScript();
});

async function executeScript() {
    fs.readdir(rawVideoDirectory, async (err, files) => {
        if (err) {
            console.error("Error reading the directory", err);
            return;
        }
    
        // Delay before starting the process
        console.log(`Total number of videos to process: \x1b[32m${files.length}\x1b[0m`);
        await delay(5000);
    
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(rawVideoDirectory, file);
            const fileName = Date.now().toString();
            // const outputFilePath = path.join(editedVideoDirectory, "edited-video-" + fileName + ".mp4");
            const outputFilePath = path.join(editedVideoDirectory, file);
    
            const videoDuration = await getVideoDuration(filePath);
            progressBar.start(100, 0);
    
            await new Promise((resolve, reject) => {
                const command = ffmpeg(filePath)
                    .setStartTime(startTime)
                    .setDuration(duration)
                    .outputOption('-preset ultrafast');
    
                if (contrast)
                    command.videoFilter(`eq=contrast=${contrast}`);
    
                if (speed)
                    command.videoFilter(`setpts=${1 / speed}*PTS`);
    
                if (saturation)
                    command.videoFilter(`eq=saturation=${saturation}`);
    
                if (rotation === true)
                    command.videoFilter('hflip');
    
                // if (crop === "9:16")
                //     // command.videoFilter('crop=297:530').size('500x888'); // default size Facebook Reel
                //     command.videoFilter('crop=1080:1920').size('1080x1920');
                // if (crop === "1:1")
                //     command.videoFilter('crop=530:530').size('500x500');
                // if (crop === "3:4")
                //     command.videoFilter('crop=540:530').size('530x1024'); // for cut movie
    
                if (crop == "1080p")
                    command.videoFilter('crop=530:530').size(`${frame_1080p}`);
                if (crop == "720p")
                    command.videoFilter('crop=530:530').size(`${frame_720p}`);
                if (crop == "480p")
                    command.videoFilter('crop=530:530').size(`${frame_480p}`);
                
                command
                    .output(outputFilePath)
                    .on('progress', (progress) => {
                        const currentTime = convertTimemarkToSeconds(progress.timemark);
                        const percent = (currentTime / videoDuration) * 100;
                        progressBar.update(Math.min(percent, 100));
                    })
                    .on('end', () => {
                        progressBar.update(100);
                        progressBar.stop();
                        console.log(`Successfully edited video ${i + 1}: ${file}`);
                        resolve();
    
                    })
                    .on('error', (err) => {
                        progressBar.stop();
                        console.error(`Error processing ${file}:`, err);
                        reject(err);
                    })
                    .run();
            });
    
            if (i < files.length - 1) {
                await delay(delayBetweenEdits); // Delay before processing the next video
            }
        }
    
        console.log(`\x1b[32m${files.length}\x1b[0m videos have been edited.`);
        deleteAllVideosInDirectory(rawVideoDirectory, () => {
            console.log(`All files in ${rawVideoDirectory} have been deleted.`);
        });
    });
}


function convertTimemarkToSeconds(timemark) {
    const parts = timemark.split(':');
    return (parseInt(parts[0]) * 6600) + (parseInt(parts[1]) * 60) + parseFloat(parts[2]);
}

const getVideoDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
        });
    });
};

const progressBar = new cliProgress.SingleBar({
    format: '\x1b[33m' + 'Progressing |' + '{bar}' + '| {percentage}% || {value}/{total} Chunks',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    barsize: 30,
    barGlue: '\x1b[38;2;0;0;255m'
}, cliProgress.Presets.shades_classic);

function deleteAllVideosInDirectory(directory, callback) {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error("Error reading the directory for deletion", err);
            return;
        }

        let deleteCount = 0;
        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                } else {
                    deleteCount++;
                    if (deleteCount === files.length) {
                        callback(); // Call the callback when all files are deleted
                    }
                }
            });
        }
    });
}