import Stream from './Stream.js';
import ParseStream from './ParseStreamW.js';
import Transmuxer from './Transmuxer.js';

export default class Parser extends Stream {
    constructor() {
        super();
        this.parseStream = new ParseStream();
        this.manifest = {
            allowCache: true, //Allow
            segments: [],
            //version: number
            //duration: number
            //mediaSequence: number
            //playlistType: VOD || EVENT
            //endlist: boolean

        };
        //Init variables
        const uris = []; // save array uri
        let currentUri = {};    // current uri
        /* eslint-disable consistent-this */
        var that = this;
        // 
        this.parseStream.on('data', function(entry) {        
            if (entry.type == "uri"){
                currentUri.uri = entry.uri;
                uris.push(currentUri);
                // if no explicit duration was declared, use the target duration
                if (that.manifest.targetDuration && !('duration' in currentUri)) {
                    this.trigger('warn', {
                        message: 'defaulting segment duration to the target duration'
                    });
                    currentUri.duration = that.manifest.targetDuration;
                }
                // currentUri.timeline = currentTimeline;
                // annotate with initialization segment information, if necessary
                // if (currentMap) {
                //     currentUri.map = currentMap;
                // }
                // reset the last byterange end as it needs to be 0 between parts
                // lastPartByterangeEnd = 0;
                // prepare for the next URI
                currentUri = {};
            }
            if (entry.type == "tag"){
                if (entry.tagType == "unknown"){
                    this.trigger('warn', {
                        message: 'unknown tag type'
                      });
                }else
                if (entry.tagType == "m3u"){
                    
                }
                else
                if (entry.tagType == "inf"){
                    if (!('mediaSequence' in that.manifest)) {
                        that.manifest.mediaSequence = 0;
                        this.trigger('info', {
                          message: 'defaulting media sequence to zero'
                        });
                    }
                    if (entry.duration > 0) {
                        currentUri.duration = entry.duration;
                    }
    
                    if (entry.duration === 0) {
                        currentUri.duration = 0.01;
                        this.trigger('info', {
                            message: 'updating zero segment duration to a small value'
                        });
                    }
                    that.manifest.segments = uris;
                }
                else
                if (entry.tagType == "targetduration"){
                    if (!isFinite(entry.duration) || entry.duration < 0) {
                        this.trigger('warn', {
                          message: 'ignoring invalid target duration: ' + entry.duration
                        });
                        return;
                    }
                    that.manifest.targetDuration = entry.duration;
                }
                else
                if (entry.tagType == "version"){
                    if (entry.version) {
                      that.manifest.version = entry.version;
                    }
                }
                else
                if (entry.tagType == "media-sequence"){
                    if (!isFinite(entry.number)) {
                        this.trigger('warn', {
                          message: 'ignoring invalid media sequence: ' + entry.number
                        });
                        return;
                      }
                      that.manifest.mediaSequence = entry.number;
                }
                else
                if (entry.tagType == "playlist-type"){
                    if (!(/VOD|EVENT/).test(entry.playlistType)) {
                        this.trigger('warn', {
                            message: 'ignoring unknown playlist type: ' + entry.playlist
                        });
                        return;
                    }
                    that.manifest.playlistType = entry.playlistType;
                }
                else
                if (entry.tagType == "endlist"){
                    that.manifest.endList = true;
                }
                else
                if (entry.tagType == "allow-cache"){
                    that.manifest.allowCache = entry.allowed;
                    if (!('allowed' in entry)) {
                        this.trigger('info', {
                            message: 'defaulting allowCache to YES'
                        });
                        that.manifest.allowCache = true;
                    }
                }
            }
            
        }); 
        this.on('end', () => {
            console.log(that.manifest);
            console.log(uris);
        });
    }
    end(){
        this.trigger('end');
    }
    //test ,m3u8file
    test(file){
        this.parseStream.push(file);
    }

//     duration: 2
// uri: "https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-p
// opsapp/cseg-v1-1-f2-v1-a1.ts"
    playvideo(){
        const video = document.createElement('video');
        // video.width = 500;
        // video.height = 500;
        // video.controls = true;
        // const source = document.createElement('source');
        this.manifest.segments.forEach((segment) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', segment.uri);
            // Received is video/mp2t binary data, Blob type can also be, but arraybuffer type is convenient for subsequent direct processing. 
            xhr.responseType = "arraybuffer";
            xhr.send();
            xhr.onreadystatechange = function () {
            if (xhr.readyState ==4) {
                if (xhr.status == 200) {
                    transferFormat(xhr.response);
                } else {
                    console.log('error');
                }
            }
            }
        })
        function transferFormat(data){
            var a = new Transmuxer();
            a.push(data);
        }

    }
    
}
