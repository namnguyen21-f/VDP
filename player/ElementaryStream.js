import Stream from '../Stream.js';
export default class ElementaryStream extends Stream{
    constructor(){
      super();
        this.programMapTable = null;
        this.state = {
          video : {
              data: [],
              size: 0
          },
          audio : {
              data: [],
              size: 0
          },
          timedMetadata : {
              data: [],
              size: 0
          },
        }
        var self = this;
        this.parsePes = function parsePes(payload, pes) {
            var ptsDtsFlags;
            var startPrefix = payload[0] << 16 | payload[1] << 8 | payload[2]; // default to an empty array
            pes.data = new Uint8Array(); // In certain live streams, the start of a TS fragment has ts packets
            // that are frame data that is continuing from the previous fragment. This
            // is to check that the pes data is the start of a new pes payload
            if (startPrefix !== 1) {
              return;
            } // get the packet length, this will be 0 for video
            pes.packetLength = 6 + (payload[4] << 8 | payload[5]); // find out if this packets starts a new keyframe
            pes.dataAlignmentIndicator = (payload[6] & 0x04) !== 0; // PES packets may be annotated with a PTS value, or a PTS value
            // and a DTS value. Determine what combination of values is
            // available to work with.
            ptsDtsFlags = payload[7]; // PTS and DTS are normally stored as a 33-bit number.  Javascript
            // performs all bitwise operations on 32-bit integers but javascript
            // supports a much greater range (52-bits) of integer using standard
            // mathematical operations.
            // We construct a 31-bit value using bitwise operators over the 31
            // most significant bits and then multiply by 4 (equal to a left-shift
            // of 2) before we add the final 2 least significant bits of the
            // timestamp (equal to an OR.)
            if (ptsDtsFlags & 0xC0) {
              // the PTS and DTS are not written out directly. For information
              // on how they are encoded, see
              // http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
              pes.pts = (payload[9] & 0x0E) << 27 | (payload[10] & 0xFF) << 20 | (payload[11] & 0xFE) << 12 | (payload[12] & 0xFF) << 5 | (payload[13] & 0xFE) >>> 3;
              pes.pts *= 4; // Left shift by 2
              pes.pts += (payload[13] & 0x06) >>> 1; // OR by the two LSBs
              pes.dts = pes.pts;
              if (ptsDtsFlags & 0x40) {
                pes.dts = (payload[14] & 0x0E) << 27 | (payload[15] & 0xFF) << 20 | (payload[16] & 0xFE) << 12 | (payload[17] & 0xFF) << 5 | (payload[18] & 0xFE) >>> 3;
                pes.dts *= 4; // Left shift by 2
                pes.dts += (payload[18] & 0x06) >>> 1; // OR by the two LSBs
              }
            } // the data section starts immediately after the PES header.
            // pes_header_data_length specifies the number of header bytes
            // that follow the last byte of the field.
            pes.data = payload.subarray(9 + payload[8]);
        }
        this.push = function (data) {
          if (data.type == "pmt"){
              var event = {
                  type: 'metadata',
                  tracks: []
              };
              self.programMapTable = data.programMapTable; // translate audio and video streams to tracks
              if (self.programMapTable.video !== null) {
                  event.tracks.push({
                    timelineStartInfo: {
                      baseMediaDecodeTime: 0
                    },
                    id: +self.programMapTable.video,
                    codec: 'avc',
                    type: 'video'
                  });
              }
              if (self.programMapTable.audio !== null) {
                  event.tracks.push({
                    timelineStartInfo: {
                      baseMediaDecodeTime: 0
                    },
                    id: +self.programMapTable.audio,
                    codec: 'adts',
                    type: 'audio'
                  });
              }
              console.log(event);
              self.trigger('data', event);
          }
        }
    }
}