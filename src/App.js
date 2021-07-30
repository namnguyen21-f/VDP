import logo from './logo.svg';
import './App.css';
import React, { useEffect,useRef, useState } from 'react';
import {parse} from './mpd/MPDparser';
import {Transmuxer} from './Tranmux/mp4/transmuxer';
import Parser from './VDP-master/ParserW';
function App() {
  var test = new Parser();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  var res,manifestUri,duration = 0,buffer = null;
  var hlsParsed;
  var buffer ,totalDuration =0;
  var mediaSource = new MediaSource(); 
  let currentIdx = 1 , flag =0;

  const limitPreload = 6;
  let currentPreload = 0;
  
  const [progressWidth, setProgressWidth] = useState(null);

  function appendBuffer(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
  };    

  function logevent (event) {
    console.log(event);
  } 

  async function transferFormat (data) {
    var outputType = 'combined';
    var combined = outputType === 'combined' || false;
    // Save source data from ArrayBuffer format to operable Uint8Array format
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    var segment = new Uint8Array(data); 
    
    // Receive no audio TS file, OutputType is set to'video'and audio TS is set to'combined'
    
    var remuxedSegments = [];
    var remuxedBytesLength = 0;
    var remuxedInitSegment = null;
    // The Remux option defaults to true, mixes the audio and video of the source data into mp4, and false does not.
    var transmuxer = new Transmuxer({remux: combined});
 
    // Listen for data events and start transforming streams
    transmuxer.on('data', function(event) {
      if (event.type === outputType) {
        remuxedSegments.push(event);
        remuxedBytesLength += event.data.byteLength;
        remuxedInitSegment = event.initSegment;
      }
    });
    // Listen for transformations to complete events, splice the final results and pass them in to MediaSource
    transmuxer.on('done', function () {
     var offset = 0;
      var bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength)
      bytes.set(remuxedInitSegment, offset);
      offset += remuxedInitSegment.byteLength;

      for (var j = 0, i = offset; j < remuxedSegments.length; j++) {
        bytes.set(remuxedSegments[j].data, i);
        i += remuxedSegments[j].byteLength;
      }
      remuxedSegments = [];
      remuxedBytesLength = 0;
      // Resolve the transformed mp4-related information, independent of the final conversion results
      // vjsParsed = muxjs.mp4.tools.inspect(bytes);
      buffer.appendBuffer(bytes);
      
    });
    // The push method may trigger the'data'event, so it is called after the event registration is completed.
    transmuxer.push(segment); // Input source binary data, divided into M2TS packages, calling the process in the figure above in turn
    // The call to flush triggers the'done'event directly, so call it after the event registration is complete
    transmuxer.flush(); // Clear all data from the cache
  } 
  
  function onSeeking(){
    var seekableTimeRanges = videoRef.current.seekable;
    
    var seekableEnd = videoRef.current.seekable.end(videoRef.current.seekable.length - 1);
    var context = canvasRef.current.getContext('2d');
    videoRef.current.addEventListener('seeked', () =>{
      var inc = canvasRef.current.width / videoRef.current.duration;
      context.fillStyle = 'lightgray';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.fillStyle = 'red';
      context.strokeStyle = 'white';
      for (let i = 0; i < videoRef.current.buffered.length; i++) {
        var startX = videoRef.current.buffered.start(i) * inc;
        var endX = videoRef.current.buffered.end(i) * inc;
        var width = endX - startX;
       
        context.fillRect(startX, 0, width, canvasRef.current.height);
        context.rect(startX, 0, width, canvasRef.current.height);
        context.stroke();
      }
    })

    // videoRef.current.addEventListener('progress', () =>{
    //   var duration =  videoRef.current.duration;
    //   if (duration > 0) {
    //     for (var i = 0; i < videoRef.current.buffered.length; i++) {
    //       if (videoRef.current.buffered.start(videoRef.current.buffered.length - 1 - i) < videoRef.current.currentTime) {
    //         setProgressWidth((videoRef.current.buffered.end(videoRef.current.buffered.length - 1 - i) / duration) * 100 + "%");
    //         break;
    //       }
    //     }
    //   }
    // })

 
    
  }

  async function prepareSourceBuffer () {
    var outputType = 'combined';
    var combined = outputType === 'combined' || false;

    //Set up media source

    for (let i=0;i< hlsParsed.segments.length ;i++){
      totalDuration += hlsParsed.segments[i].duration;
    }
    
    videoRef.current.src = URL.createObjectURL(mediaSource);
    // Converted MP4 audio format and video format
    var codecsArray = ["avc1.64001f", "mp4a.40.2"];
    mediaSource.addEventListener('sourceopen', async function () {
      // The default duration attribute of the MediaSource instance is NaN
      mediaSource.duration = Math.round(totalDuration);
      // Converting to MP4 with audio and video//video/mp4; codecs="avc1.4D401E, mp4a.40.2"
      if (combined) {
        buffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
      } else if (outputType === 'video') {
        // Converting to MP4 with video only
        buffer = mediaSource.addSourceBuffer('video/mp4;codecs="' + codecsArray[0] + '"');
      } else if (outputType === 'audio') {
        // Converting to MP4 with audio only
        buffer = mediaSource.addSourceBuffer('audio/mp4;codecs="' + (codecsArray[1] ||codecsArray[0]) + '"');
      }

      // Init buffer
      const uri = "https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/" + hlsParsed.segments[0].uri;
      res = await fetch(uri);
      const TSbuffer = await res.arrayBuffer();
      await transferFormat(TSbuffer);

      // Init buffer

      buffer.addEventListener('updatestart', () =>{});
      buffer.addEventListener('updateend',async () => {
        if (currentIdx < hlsParsed.segments.length && currentPreload < limitPreload){
          const uri = "https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/" + hlsParsed.segments[currentIdx].uri;
          res = await fetch(uri);
          const TSbuffer = await res.arrayBuffer();
          buffer.timestampOffset += hlsParsed.segments[currentIdx].duration;
          await transferFormat(TSbuffer);
          currentIdx +=1;
          currentPreload+=1;
        }else if (currentPreload >= limitPreload){
          console.log(currentPreload)
          currentPreload = 0;
        }
        else{
          mediaSource.endOfStream();
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(_ => {
                // Automatic playback started!
                // Show playing UI.
                console.log("audio played auto");
              })
              .catch(error => {
                // Auto-play was prevented
                // Show paused UI.
                console.log("playback prevented");
              });
          }
        }
      });

      videoRef.current.addEventListener('timeupdate', function() {
        var duration =  videoRef.current.duration;
        // const tmp = -1;
        // while (tmp > videoRef.current.currentTime)
        if (duration > 0) {
          setProgressWidth(((videoRef.current.currentTime / duration)*100) + "%");
        }
      });
  
      buffer.addEventListener('error', logevent);
     
      // MP4 buffer is ready to pass in the converted data
      // Put bytes in the source Buffer created by Media Source
      // https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/appendBuffer
      
      onSeeking();
      // Autoplay
    });

    
  };


  useEffect(() => {
    async function fetchData(){
      manifestUri = 'https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/index-f2-v1-a1.m3u8';
      res = await fetch(manifestUri);
      const hlsfileText = await res.text();
      test.test(hlsfileText);
      hlsParsed = test.end();
      prepareSourceBuffer();
      
      // const manifestUri = 'https://vnw-vod-cdn.popsww.com/hn-wWlxuIBQdoM323jHTsJu72jGh3E/videos/transcoded/shippuden_274_app-popsapp/cseg-v1-1-f2-v1-a1.ts';
      // const res = await fetch(manifestUri);
      // const manifest = await res.arrayBuffer();
      // transferFormat(manifest);
      

    }
    fetchData();
  },[])

  return (
    <div id="app2" className="App">
      <video preload="auto" ref={videoRef} controls />
      <p>
        <canvas ref={canvasRef} width="300" height="20"/>
      </p>
      <div className="progress">
        <span id="progress-amount" style={{width: progressWidth}}></span>
      </div>
    </div>
  );
}

export default App;
