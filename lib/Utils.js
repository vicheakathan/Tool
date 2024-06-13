/**
 * @github.com/motebaya - © 2023-10
 * file: util.js
 * module utility helper
 *
 */
const zlib = require("zlib");
const CryptoJS = require("crypto-js");
const ejs = require("ejs");

const urlMobileRegex = new RegExp(
  /(?:^http[s]\:\/\/vt\.tiktok\.com\/(?<id>[\w+]*))/
);
const urlWebRegex = new RegExp(
  /(?:^https\:\/\/www\.tiktok\.com\/@(?<username>[^\"]*?)\/video\/(?<id>[0-9]*))/
);
const usernameRegex = new RegExp(/^(?:@)?([a-zA-Z0-9_\.]{2,24})$/);

function isTiktokUsername(username) {
  if (username !== undefined) {
    if (usernameRegex.test(username)) {
      return { status: true };
    }
    return {
      status: false,
      message: `invalid tiktok username ${username}!`,
    };
  }
  return {
    status: false,
    message: "no username suplied...",
  };
};

function isTiktokUrl(url) {
  if (url !== undefined) {
    if (urlMobileRegex.test(url) || urlWebRegex.test(url)) {
      return { status: true };
    }
    return { status: false, message: "invalid tiktok video url!" };
  }
  return { status: false, message: "no suplied url..." };
};

module.exports = {
  isTiktokUsername,
  isTiktokUrl,
};