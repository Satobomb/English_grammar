

  const recorder = require('node-record-lpcm16'); //soxをNode.jsから使うためのモジュール

  // Imports the Google Cloud client library
  const speech = require('@google-cloud/speech'); //Cloud Speech-to-text APIを使うためのモジュール

  // Creates a client
  const client = new speech.SpeechClient();

  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  const encoding = 'LINEAR16';
  const sampleRateHertz = 16000;
  const languageCode = 'ja-JP';

  const request = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: true, // If you want interim results, set this to true
  };

  // Create a recognize stream
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', data =>
      process.stdout.write(
        data.results[0] && data.results[0].alternatives[0]
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : '\n\nReached transcription time limit, press Ctrl+C\n'
      )
    );

  // Start recording and send the microphone input to the Speech API.
  // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies

  //function voiceRec(){
  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 10000,
      // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
      verbose: false,
      recordProgram: 'rec', // Try also "arecord" or "sox"
      thresholdStart: 0.2,
      thresholdEnd: 0.1,
      silence: '100.0',
      
    })
    .stream()
    .on('error', console.error)
    .pipe(recognizeStream);

  console.log('Listening, press Ctrl+C to stop.');

//}
//voiceRec();
// const recording = recorder.record();
// recording.stop();
// setTimeout(() => {
//   recording.pause()
// }, 3000);