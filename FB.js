const request = require('request');
const fs = require('fs');
const readline = require('readline');

const getUrl = (url) => {
    return new Promise((resolve, reject) => {
        let options = {
            'method': 'POST',
            'url': 'https://www.getfvid.com/downloader',
            formData: {
                'url': url
            }
        };
        request(options, function (error, response) {
            if (error) {
                reject(error);
                return;
            }
            let namaVideo = "noname " + Math.random(666) + ".mp4"
    
            let private = response.body.match(/Uh-Oh! This video might be private and not publi/g)
            if (private) {
                console.log('\x1b[31m%s\x1b[0m', `[-] This Video Is Private`);
                reject("Private video");
                return;
            }
    
            const regexNama = /<p class="card-text">(.*?)<\/p>/g
            let arrNama = [...response.body.matchAll(regexNama)]
            if (arrNama[0] != undefined) {
                namaVideo = arrNama[0][1] + ".mp4"
            }
    
            const rgx = /<a href="(.+?)" target="_blank" class="btn btn-download"(.+?)>(.+?)<\/a>/g
            let arr = [...response.body.matchAll(rgx)]
            let resAkhir = [];

            if (arr.length > 0) {
                // Always select the first available quality
                const videoUrl = arr[0][1].replace(/amp;/gi, '');
                resolve([namaVideo, videoUrl]);
            } else {
                console.log('\x1b[31m%s\x1b[0m', `[-] Invalid Video URL \n`);
                reject("Invalid video URL");
            }
            
        });
    });
}

const download = (name, url) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync('downloadedVideos')) {
            fs.mkdirSync('downloadedVideos');
        }
        console.log('[+] Downloading File . . .')
        name = name.replace(/[\\/:"*?<>|]/g, '')
        let file = fs.createWriteStream('downloadedVideos/' + name);
        request({
            uri: url,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
            },
            gzip: true,
            rejectUnauthorized: false
        })
        .pipe(file)
        .on('finish', () => {
            console.log('\x1b[32m%s\x1b[0m', `[+] Download Success : ${name}`);
            resolve();
        })
        .on('error', (error) => {
            reject(error);
        });
    });
}

const start = () => {
    const rl = readline.createInterface({
        input: fs.createReadStream('link.txt'),
        output: process.stdout
    });

    rl.on('line', (url) => {
        console.log('\x1b[32m%s\x1b[0m', `\n[+] Checking Video URL: ${url}`);
        getUrl(url).then(([name, videoUrl]) => {
            return download(name, videoUrl);
        }).then(() => {
            // Proceed to next URL
        }).catch(error => {
            console.error('\x1b[31m%s\x1b[0m', `Error downloading video: ${error}`);
        });
    });

    rl.on('close', () => {
        console.log('\x1b[32m%s\x1b[0m', '\nAll videos downloaded.');
    });
}

start();
