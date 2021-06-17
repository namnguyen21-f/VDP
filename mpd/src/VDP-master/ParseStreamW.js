import Stream from './Stream.js';

export default class ParseStream extends Stream{
    constructor(){
        super();
        this.tagMappers = [];
    }
    push(line){
        var match;
        let event;
        //Remove space
        line = line.trim();
        //Line == ""
        if (line.length == 0){
            return;
        }
        // const newLines = this.tagMappers.reduce((acc, mapper) => {
        //     const mappedLine = mapper(line);
        //     // skip if unchanged
        //     if (mappedLine === line) {
        //       return acc;
        //     }
        //     return acc.concat([mappedLine]);
        // }, [line]);
        line.split("\n").forEach(newLine => {
          if (newLine[0] !== "#"){
              this.trigger('data', {
                  type: 'uri',
                  uri: newLine
                });
              return;
          }
          // Tags 
          match = (/^#EXTM3U/).exec(newLine);
          if (match) {
            this.trigger('data', {
              type: 'tag',
              tagType: 'm3u'
            });
            return;
          }
          match = (/^#EXTINF:?([0-9\.]*)?,?(.*)?$/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'inf'
            };
            if (match[1]) {
              event.duration = parseFloat(match[1]);
            }
            if (match[2]) {
              event.title = match[2];
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-TARGETDURATION:?([0-9.]*)?/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'targetduration'
            };
            if (match[1]) {
              event.duration = parseInt(match[1], 10);
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-VERSION:?([0-9.]*)?/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'version'
            };
            if (match[1]) {
              event.version = parseInt(match[1], 10);
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-MEDIA-SEQUENCE:?(\-?[0-9.]*)?/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'media-sequence'
            };
            if (match[1]) {
              event.number = parseInt(match[1], 10);
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-PLAYLIST-TYPE:?(.*)?$/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'playlist-type'
            };
            if (match[1]) {
              event.playlistType = match[1];
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-ALLOW-CACHE:?(YES|NO)?/).exec(newLine);
          if (match) {
            event = {
              type: 'tag',
              tagType: 'allow-cache'
            };
            if (match[1]) {
              event.allowed = !(/NO/).test(match[1]);
            }
            this.trigger('data', event);
            return;
          }
          match = (/^#EXT-X-ENDLIST/).exec(newLine);
          if (match) {
            this.trigger('data', {
              type: 'tag',
              tagType: 'endlist'
            });
            return;
          }     
          // unknown tag type
          this.trigger('data', {
            type: 'tag',
            tagType: 'unknown'
          });
            
        });



    }



}