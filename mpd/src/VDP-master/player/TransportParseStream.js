var H264_STREAM_TYPE = 0x1B;
var  ADTS_STREAM_TYPE= 0x0F;
var METADATA_STREAM_TYPE = 0x15;
import Stream from '../Stream.js';
export default class TransportStream extends Stream{
    constructor(){
      super();
        this.programMapTable = null;
        var self = this;
        //Metadata Stream Type
        this.parsePmt = function (payload, pmt) {
            var sectionLength, tableEnd, programInfoLength, offset; 
            // PMTs can be sent ahead of the time when they should actually
            // take effect. We don't believe this should ever be the case
            // for HLS but we'll ignore "forward" PMT declarations if we see
            // them. Future PMT declarations have the current_next_indicator
            // set to zero.
            if (!(payload[5] & 0x01)) {
                return;
            } // overwrite any existing program map table
            self.programMapTable = {
                video: null,
                audio: null,
                'timed-metadata': {}
            }; // the mapping table ends at the end of the current section
            
            sectionLength = (payload[1] & 0x0f) << 8 | payload[2];
            tableEnd = 3 + sectionLength - 4; 
            // to determine where the table is, we have to figure out how
            // long the program info descriptors are
            programInfoLength = (payload[10] & 0x0f) << 8 | payload[11]; // advance the offset to the first entry in the mapping table
            offset = 12 + programInfoLength;
            while (offset < tableEnd) {
                var streamType = payload[offset];
                var pid = (payload[offset + 1] & 0x1F) << 8 | payload[offset + 2]; // only map a single elementary_pid for audio and video stream types
                // TODO: should this be done for metadata too? for now maintain behavior of
                //       multiple metadata streams
                if (streamType === H264_STREAM_TYPE && self.programMapTable.video === null) {
                  self.programMapTable.video = pid;
                } else if (streamType === ADTS_STREAM_TYPE && self.programMapTable.audio === null) {
                  self.programMapTable.audio = pid;
                } else if (streamType === METADATA_STREAM_TYPE) {
                  // map pid to stream type for metadata streams
                  self.programMapTable['timed-metadata'][pid] = streamType;
                } // move to the next table entry
                // skip past the elementary stream descriptors, if present
                offset += ((payload[offset + 3] & 0x0F) << 8 | payload[offset + 4]) + 5;
            } // record the map on the packet as well
            pmt.programMapTable  = self.programMapTable;
        }

        this.parsePsi = function parsePsi(payload, psi) {
          var offset = 0; 
          // PSI packets may be split into multiple sections and those
          // sections may be split into multiple packets. If a PSI
          // section starts in this packet, the payload_unit_start_indicator
          // will be true and the first byte of the payload will indicate
          // the offset from the current position to the start of the
          // section.
      
          if (psi.payloadUnitStartIndicator) {
            offset += payload[offset] + 1;
          }
      
          if (psi.type === 'pat') {
            this.parsePat(payload.subarray(offset), psi);
          } else {
            this.parsePmt(payload.subarray(offset), psi);
          }
        };
        
        this.parsePat = function parsePat(payload, pat) {
            pat.section_number = payload[7]; // eslint-disable-line camelcase
        
            pat.last_section_number = payload[8]; // eslint-disable-line camelcase
            // skip the PSI header and parse the first PMT entry
        
            self.pmtPid = (payload[10] & 0x1F) << 8 | payload[11];
            pat.pmtPid = self.pmtPid;

            
        };

        this.push = function (packet) {
          var result = {},
          offset = 4;
          result.payloadUnitStartIndicator = !!(packet[1] & 0x40); 
          // pid is a 13-bit field starting at the last bit of packet[1]
      
          result.pid = packet[1] & 0x1f;
          result.pid <<= 8;
          result.pid |= packet[2]; 
          // if an adaption field is present, its length is specified by the
          // fifth byte of the TS packet header. The adaptation field is
          // used to add stuffing to PES packets that don't fill a complete
          // TS packet, and to specify some forms of timing and control data
          // that we do not currently use.
          if ((packet[3] & 0x30) >>> 4 > 0x01) {
            offset += packet[offset] + 1;
          } // parse the rest of the packet based on the type
          
          if (result.pid === 0) {
            result.type = 'pat';
            self.parsePsi(packet.subarray(offset), result);
            
            self.trigger('data', result);
          }else if (result.pid === self.pmtPid) {
            result.type = 'pmt';
            self.parsePsi(packet.subarray(offset), result);
            self.trigger('data', result); // if there are any packets waiting for a PMT to be found, process them now
          }else {
            self.processPes_(packet, offset, result);
          }
          // else if (this.programMapTable === undefined) {
          //   // When we have not seen a PMT yet, defer further processing of
          //   // PES packets until one has been parsed
          //   this.packetsWaitingForPmt.push([packet, offset, result]);
          // } 
        };

        this.processPes_ = function (packet, offset, result) {
            // set the appropriate stream type
            if (result.pid === this.programMapTable.video) {
              result.streamType = H264_STREAM_TYPE;
            } else if (result.pid === this.programMapTable.audio) {
              result.streamType = ADTS_STREAM_TYPE;
            } else {
              // if not video or audio, it is timed-metadata or unknown
              // if unknown, streamType will be undefined
              result.streamType = this.programMapTable['timed-metadata'][result.pid];
            }
            result.type = 'pes';
            result.data = packet.subarray(offset);
            self.trigger('data', result);
        };
    }

}