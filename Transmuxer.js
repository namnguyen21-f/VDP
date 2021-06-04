
import PacketStream from './player/TransportPacketStream.js';
import ElementaryStream from './player/ElementaryStream.js';
import TransportParseStream from './player/TransportParseStream.js';
export default class Transmuxer {
    constructor(){
        var pipeline = {};
        this.transmuxPipeline_ = null;
        //Metadata Stream Type
        this.dispatchType = "0x15".toString();
        this.setUpTsPipeine = function (){
            pipeline = {};
            pipeline._packetStream = new PacketStream(); // main
            pipeline._parseStream = new TransportParseStream();
            pipeline._elementaryStream = new ElementaryStream();
            var aa = pipeline._packetStream.pipe(pipeline._parseStream).pipe(pipeline._elementaryStream);       
            pipeline.headOfPipeline = pipeline._packetStream;
            this.transmuxPipeline_ = pipeline;
        }
        this.push = function (data) {
            this.setUpTsPipeine();
            this.transmuxPipeline_.headOfPipeline.push(data); // PacketStream.push()
        }
    }
}