var MP2T_PACKET_LENGTH = 188; // standard packet size,
var SYNC_BYTE = 0x47; // Sync byte of packet  
import Stream from '../Stream.js';
export default class PacketStream extends Stream{
    constructor(){
        super();
        this.buffer = new Uint8Array(MP2T_PACKET_LENGTH); //create an array buffer
        this.bytesInBuffer = 0;
        var self = this;
        // push data,divide it into segments and emit it (trigger data)
        this.push = function (bytes) {
            var startIndex = 0,
            endIndex = MP2T_PACKET_LENGTH,
            everything; // If there are bytes remaining from the last segment, prepend them to the
            // bytes that were pushed in
            // Push to the head of array buffer
            if (self.bytesInBuffer) {
                //create an array buffer
                everything = new Uint8Array(bytes.byteLength + bytesInBuffer);
                everything.set(buffer.subarray(0, bytesInBuffer));
                // add bytes into everything
                everything.set(bytes, bytesInBuffer);
                bytesInBuffer = 0;
            } else {
                everything = new Uint8Array(bytes);
            } // While we have enough data for a packet

            while (endIndex < everything.byteLength) {
                // Look for a pair of start and end sync bytes in the data..
                // A sync byte error is when the first byte of a TS packet does not contain the value 0x47,
                if (everything[startIndex] === SYNC_BYTE && everything[endIndex] === SYNC_BYTE) {
                  // We found a packet so emit it and jump one whole packet forward in
                  // the stream
                  this.trigger('data', everything.subarray(startIndex, endIndex));
                  startIndex += MP2T_PACKET_LENGTH;
                  endIndex += MP2T_PACKET_LENGTH;
                  continue;
                } 
                // If we get here, we have somehow become de-synchronized and we need to step
                // forward one byte at a time until we find a pair of sync bytes that denote
                // a packet
                startIndex++;
                endIndex++;
            } 
            // If there was some data left over at the end of the segment that couldn't
            // possibly be a whole packet, keep it because it might be the start of a packet
            // that continues in the next segment
            if (startIndex < everything.byteLength) {
                self.buffer.set(everything.subarray(startIndex), 0);
                self.bytesInBuffer = everything.byteLength - startIndex;
            }
        }
        //Flush data in buffer
        this.flush = function () {
            // If the buffer contains a whole packet when we are being flushed, emit it
            // and empty the buffer. Otherwise hold onto the data because it may be
            // important for decoding the next segment
            if (self.bytesInBuffer === MP2T_PACKET_LENGTH && self.buffer[0] === SYNC_BYTE) {
              this.trigger('data', buffer);
              self.bytesInBuffer = 0;
            }
            this.trigger('done');
        };

        this.endTimeline = function () {
            this.flush();
            this.trigger('endedtimeline');
        };
    }
}