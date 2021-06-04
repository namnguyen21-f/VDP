import Parser from './ParserW.js';
const manifest = [
    '#EXTM3U',
    '#EXT-X-TARGETDURATION:4',
    '#EXT-X-PLAYLIST-TYPE:VOD',
    '#EXT-X-ALLOW-CACHE:YES',
    '#EXT-X-VERSION:3',
    '#EXT-X-MEDIA-SEQUENCE:1',
    '#EXTINF:2.000',
    'https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/cseg-v1-1-f2-v1-a1.ts',
    '#EXTINF:2.000',
    'https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/cseg-v1-2-f2-v1-a1.ts',
    '#EXT-X-ENDLIST',
].join('\n');

var test = new Parser();
test.test(manifest);
test.end();
test.playvideo();