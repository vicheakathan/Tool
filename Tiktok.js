/**
 * @github.com/motebaya - © 2023-10
 * file: snaptik.js
 */
const Init = require("./lib/Init.js");
const FormData = require("form-data");
const cheerio = require("cheerio");
// const chalk = require("chalk");
const Utils = require("./lib/Utils.js");
const axios = require("axios");
const fs = require('fs');
const readline = require('readline');

const host = "https://snaptik.app";
const outPutDirectory = "rawVideos";

if (!fs.existsSync(outPutDirectory)) {
    fs.mkdirSync(outPutDirectory);
}

async function renderVideo(token) {
    return new Promise(async (resolve) => {
        console.debug(
            'Rendering With Token::...'
        );
        if (token !== undefined) {
            let tasks = await this.client.get(`${this.host}/render.php`, {
                params: {
                    token: token,
                },
                responseType: "json",
            });
            let data = tasks.data;
            if (data.status === 0 && Object.keys(data).includes("task_url")) {
                tasks = await this.client.get(data.task_url, {
                    responseType: "json",
                });
                data = tasks.data;
                if (data.status === 0 && data.hasOwnProperty("download_url")) {
                    console.info(
                        "Rendering success..."
                    );
                    resolve(data.download_url);
                } else {
                    console.error(
                        "Couldn't Rendering in task #2, unknow status response"
                    );
                    resolve("#");
                }
            } else {
                console.error(
                    "Couldn't Render, no task response..."
                );
                resolve("#");
            }
        } else {
            console.error(
                "No token to render..."
            );
            resolve("#");
        }
    });
}

async function downloadVideo(data) {
    try {
        const temp = Date.now('yyyy-mm-dd:hh:mm:ss');
        const filePath = temp + ".mp4";
        const response = await axios.get(data.videos[0], { responseType: 'stream' });

        const fileStream = fs.createWriteStream(outPutDirectory + "/" + filePath);

        response.data.pipe(fileStream);

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading video:', error.message);
    }
}

async function getVideoData(opts) {
    const { url, render } = opts;
    return new Promise(async (resolve) => {
        const validate = Utils.isTiktokUrl(url);
        if (validate.status) {
            const token = await Init.getToken({ host: host });
            if (token.status) {
                const form = new FormData();
                form.append("url", url);
                form.append("token", token.token);
                try {
                    const page = await axios.post(
                        `${host}/abc2.php`,
                        form
                    );
                    const innerHtml = Init.getInnerHtml(page.data);
                    if (innerHtml.status) {
                        // fs.writeFileSync("test.html", innerHtml.result);
                        const $ = cheerio.load(innerHtml.result);

                        let result;
                        const images = $("div.photo");
                        if (images.length !== 0) {
                            console.debug(
                                Utils.getHostName(host)
                                    `Images Collected...`
                            );

                            if (render) {
                                result.videos = await renderVideo(
                                    $("button.btn-render").attr("data-token")
                                );
                            }
                        } else {
                            result = {
                                ...(await Init.getWebpageInfo(url)),
                                status: true,
                                isImage: false,
                                videos: $("a")
                                    .map((i, e) => {
                                        let url = $(e).attr("href");
                                        if (url !== "/")
                                            return url.startsWith("/file") ? host + url : url;
                                    })
                                    .get(),
                            };

                            let alternateUrl = $("button").attr("data-backup");
                            if (alternateUrl !== undefined) {
                                result.videos.push(alternateUrl);
                            }

                            // if (result.videos.length > 0) {
                            //     await downloadVideo(result);
                            // }
                        }
                        resolve(result);
                    } else {
                        console.error(
                            innerHtml.message
                        );
                        resolve(innerHtml);
                    }
                } catch (error) {
                    console.error("Error fetching page:", error);
                    resolve({ status: false, message: "Error fetching page" });
                }
            } else {
                console.error(
                    token.message
                );
                resolve(token);
            }
        } else {
            console.error(
                validate.message
            );
            resolve(validate);
        }
    });
}

const path_to_url = 'link.txt';
async function main() {
    const fileContent = fs.readFileSync(path_to_url, 'utf8');
    const videoLinks = fileContent.split('\n').map(line => line.trim());
    console.log("Total Download Videos: " + videoLinks.length);

    for (var i = 0; i < videoLinks.length; i++) {
        console.log(`[+] Starting download video ${i + 1} of ${videoLinks.length}`);
        const option = {
            url: videoLinks[i]
        };
        try {
            const videoData = await getVideoData(option);
            if (videoData.status) {
                if (videoData.videos.length > 0) {
                    await downloadVideo(videoData);
                    console.log('[-] Video downloaded successfully!');
                }
            }
        } catch (error) {
            console.error('Error downloading video:', error);
        }
    }

    fs.writeFile(path_to_url, '', (err) => {
        if (err) {
            console.error('Error deleting data in file:', err);
        }
    });
}
main();