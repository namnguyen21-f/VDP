export default class Metadata{
    constructor(){
        this.state = {
            Size = 0,
            // tag data that is not complete enough to be parsed
            buffer = [],
            // the total number of bytes currently in the buffer
            bufferSize = 0,
        }
        //Metadata Stream Type
        this.dispatchType = "0x15".toString();
        this.push = function (chunk) {

        }
    }
}