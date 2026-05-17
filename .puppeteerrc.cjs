const { join } = require('path')

console.log(join(__dirname, '.cache', 'puppeteer'))
/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    defaultBrowser: 'chrome',
    chrome: {
        downloadBaseUrl:
            'https://storage.googleapis.com/chrome-for-testing-public',
    },
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
}
