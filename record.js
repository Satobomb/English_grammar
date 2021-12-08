const recorder = require('node-record-lpcm16');
const fs = require('fs');
 
const file = fs.createWriteStream('test.wav', { encoding: 'binary' });
 
recorder.record({
  sampleRate: 16000,
  channels: 1,
  threshold: 0.5,
  endOnSilence: true,
  // verbose: false,
  //recordProgram: 'rec', // Try also "arecord" or "sox" 
  thresholdStart: null,
  thresholdEnd: null,
  recorder: 'sox',
  silence: '2.0',
  device: null,
  audioType: "wav"
})
.stream()
.pipe(file);
