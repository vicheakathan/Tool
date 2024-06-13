// import axios from "axios";
const axios = require("axios");
// const logger = require("./logger.js");
const assert = require("node:assert");
const puppeteer = require("puppeteer");
const wrapper = require("axios-cookiejar-support");
const CookieJar = require("tough-cookie");
const Utils = require("./Utils.js");
const { AxiosLogger } = require('axios-logger');
const fs = require('fs');

const urlMobileRegex = new RegExp(
    /(?:^http[s]\:\/\/vt\.tiktok\.com\/(?<id>[\w+]*))/
);
const urlWebRegex = new RegExp(
    /(?:^https\:\/\/www\.tiktok\.com\/@(?<username>[^\"]*?)\/video\/(?<id>[0-9]*))/
);
const usernameRegex = new RegExp(/^(?:@)?([a-zA-Z0-9_\.]{2,24})$/);

process.on("unhandledRejection", (reason, promise) => {
    console.error(reason);
});

process.on("uncaughtException", (error) => {
    console.error(error);
});

async function getBrowser(opts) {
    if (opts !== undefined) {
        assert(
            opts.constructor === Object,
            `invalid supplied options: ${opts}`
        );
    } else {
        opts = {};
    }
    return new Promise(async (resolve) => {
        const browser = await puppeteer.launch({
            headless: opts.headless ?? false,
            ignoreHTTPSErrors: opts.ignoreHTTPSErrors ?? true,
            args: [
                "--window-size=414,1024",
                "--fast-start",
                "--disable-extensions",
                "--no-sandbox",
            ],
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.url().startsWith("http")) {
                if (
                    request.resourceType() === "image" &&
                    !request.url().includes("captcha")
                ) {
                    console.log(`Image Blocked:: ${request.url()}`);
                    request.abort();
                } else if (
                    request.resourceType() === "media" &&
                    request.headers()["content-type"] === "video/mp4"
                ) {
                    console.log(`Video Blocked:: ${request.url()}`);
                    request.abort();
                } else {
                    request.continue();
                }
            }
        });
        await page.setViewport({
            width: 414,
            height: 1024,
            deviceScaleFactor: 0,
            isMobile: true,
            hasTouch: false,
            isLandscape: false,
        });
        resolve({ browser, page });
    });
}

async function getWebpageInfo(url) {
    return new Promise(async (resolve) => {
        const validate = Utils.isTiktokUrl(url);
        if (validate.status) {
            const video_id = await getVideoId(url);

            /**
             * page fetch,
             * sometime error, due connection reset.
             */
            let page;
            try {
                page = await axios.get(url);
            } catch (err) {
                resolve({ status: false, message: err.message });
            }
            page = page.data;

            /**
             * parsing json data.
             */
            let univData = new RegExp(
                /(?<=script\sid\="\_\_UNIVERSAL\_DATA\_FOR\_REHYDRATION\_\_\"[^>+]*?\"\>)([^>+].*?)(?=\<\/script\>)/
            ).exec(page);

            try {
                if (univData !== null) {
                    univData = JSON.parse(univData[1])["__DEFAULT_SCOPE__"][
                        "webapp.video-detail"
                    ];
                    if (univData !== undefined) {
                        try {
                            // if ("itemStruct" in univData.itemInfo) {
                            if (univData.statusCode == 0) {
                                univData = univData.itemInfo.itemStruct;
                                resolve({
                                    status: true,
                                    video_id: univData.id,
                                    title:
                                        univData.imagePost !== undefined
                                            ? `${univData.imagePost.title} ${univData.desc}`
                                            : univData.desc,
                                    created: new Date(parseInt(univData.createTime) * 1000)
                                        .toLocaleString()
                                        .replace(/\//g, "-"),
                                    thumbnail: univData.video.originCover ?? univData.video.cover,
                                    // author: {
                                    //     username: univData.author.uniqueId,
                                    //     name: univData.author.nickname,
                                    //     user_id: univData.author.id,
                                    //     avatar: univData.author.avatarLarger,
                                    // },
                                    // total_views: univData.stats.playCount,
                                    // total_comment: univData.stats.commentCount,
                                    // music: {
                                    //     url: univData.music.playUrl, // music url sometime return as 403 (access denied), dunno why.
                                    //     title: univData.music.title,
                                    //     author: univData.music.author ?? univData.music.authorName,
                                    //     cover: univData.music.coverLarge,
                                    // },
                                });
                            } else {
                                console.error(
                                    `Error while parsing data::`
                                );
                                resolve({
                                    status: false,
                                    message: "Error while parsing json data",
                                });
                            }
                        } catch (error) {
                            console.error(error)
                        }
                        
                    } else {
                        console.error(
                            `[${chalk.white(this.getWebpageInfo.name)}] ${chalk.yellow(
                                "Error, Couldn't find video details!"
                            )}`
                        );
                        resolve({
                            status: false,
                            message: "no video details found!",
                        });
                    }
                } else {
                    console.error(
                        `${chalk.white(this.getWebpageInfo.name)} ${chalk.yellow(
                            "Error, Couldn't find video Universal data.!"
                        )}`
                    );
                    resolve({
                        status: false,
                        message: "no video data found.",
                    });
                }
            } catch (error) {
                console.log(error)
            }

        } else {
            console.error(
                `[${this.getWebpageInfo.name}] ${validate.message
                }`
            );
            resolve(validate);
        }
    });
}

async function getShortInfo(url) {
    return new Promise(async (resolve) => {
        const validate = Utils.isTiktokUrl(url);
        if (validate.status) {
            try {
                const res = await this.client.get("https://www.tiktok.com/oembed", {
                    params: {
                        url: url,
                    },
                    responseType: "json",
                });
                const data = res.data;
                resolve({
                    status: true,
                    video_id: data["embed_product_id"],
                    title: data["title"],
                    thumbnail: data["thumbnail_url"],
                    author: {
                        name: data["author_name"],
                        username: data["author_unique_id"],
                    },
                });
            } catch (err) {
                resolve({
                    status: false,
                    message: err.response.data["message"],
                });
            }
        } else {
            validate.message
            resolve(validate);
        }
    });
}

async function getToken(opts) {
    let { host, page } = opts;
    return new Promise(async (resolve) => {
        if (!page) {
            page = await axios.get(host);
            page = page.data;
        }
        let token = new RegExp(
            host.includes("ssstik")
                ? /(?:"tt\:'([\w]*?)'";|s_tt\s=\s'([\w]*?)')/gi
                : /name\=\"_?token"\svalue\=\"([^>*]+?)"/gi
        ).exec(page);
        if (token !== null) {
            resolve({
                status: true,
                token: token[1] ?? token[2],
            });
        } else {
            console.error(
                `Couldn't get token from::${host}`
            );
            resolve({
                status: false,
                message: "regex not match with token form!",
            });
        }
    });
}

async function getVideoId(url) {
    return new Promise(async (resolve) => {
        if (urlWebRegex.test(url)) {
            const [video_url, username, video_id] = urlWebRegex.exec(url);
            resolve({
                status: true,
                ...{ video_url, username, video_id },
            });
        } else {
            if (urlMobileRegex.test(url)) {
                console.debug(
                    `${`[${getVideoId.name}] Redirecting url...`
                    }`
                );
                const redirect = await axios.get(url, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status < 400,
                });
                resolve(await getVideoId(redirect.headers["location"]));
            } else {
                resolve({
                    status: false,
                    message: `couldn't get video id from, ${url}`,
                });
            }
        }
    });
}

function getInnerHtml(html) {
    assert(
        html !== undefined,
        `${"no suplied obfuscated html data"}`
    );

    let params = new RegExp(
        /\(\"(.*?)",(.*?),"(.*?)",(.*?),(.*?),(.*?)\)/i
    ).exec(html);
    // fs.writeFile("test.txt", "html");

    if (params !== null) {
        var [h, u, n, t, e, r] = params.slice(1).reduce((t, val) => {
            if (!isNaN(val)) {
                t.push(parseInt(val, 10));
            } else {
                t.push(val);
            }
            return t;
        }, []);

        const alpa =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
        const _decode = (d, e, f) => {
            var g = alpa.split("");
            var h = g.slice(0, e);
            var i = g.slice(0, f);
            var j = d
                .split("")
                .reverse()
                .reduce(function (a, b, c) {
                    if (h.indexOf(b) !== -1)
                        return (a += h.indexOf(b) * Math.pow(e, c));
                }, 0);
            var k = "";
            while (j > 0) {
                k = i[j % f] + k;
                j = (j - (j % f)) / f;
            }
            return k || 0;
        };

        r = "";
        for (var i = 0, len = h.length; i < len; i++) {
            var s = "";
            while (h[i] !== n[e]) {
                s += h[i];
                i++;
            }
            for (var j = 0; j < n.length; j++)
                s = s.replace(new RegExp(n[j], "g"), j);
            r += String.fromCharCode(_decode(s, e, 10) - t);
        }
        const content = new RegExp(/\.innerHTML\s=\s"([^>*].+?)";\s/).exec(
            decodeURIComponent(escape(r))
        );
        if (content !== null) {
            return {
                status: true,
                result: content[1].replace(/\\/g, ""),
            };
        }
        return {
            status: false,
            message: "couldn't deobfuscate html data...",
        };
    } else {
        return {
            status: false,
            message: "malformed html obfuscated data...",
        };
    }
}

module.exports = {
    getBrowser,
    getWebpageInfo,
    getShortInfo,
    getToken,
    getInnerHtml,
    getVideoId
};