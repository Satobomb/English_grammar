var socketio = require('socket.io');
let http = require("http");
let fs = require("fs");
let server = http.createServer();
let syncFlag = false;

server.on("request", getJs);
server.listen(8080);
console.log("Server running …");
function getJs(req, res) {
  let url = req.url;
  console.log(url);
  switch(url){
  case "/":
    fs.readFile("./index.html", "UTF-8", function (err, data) {
      res.writeHead(200, {"Content-Type": "text/html"});
      res.write(data);
      res.end();
    });
    break;
  case "/js/index.js":
    fs.readFile("./js/index.js", "UTF-8", function (err, data) {
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.write(data); 
      res.end();
    });
    break;
  case "/css/index.css":
    fs.readFile("./css/index.css", "UTF-8", function (err, data) {
      res.writeHead(200, {"Content-Type": "text/css"});
      res.write(data); 
      res.end();
    });
    break;
  case "/libqi-js/libs/qimessaging/1.0/qimessaging.js":
    fs.readFile("./libqi-js/libs/qimessaging/1.0/qimessaging.js", "UTF-8", function (err, data) {
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.write(data); 
      res.end();
    });
    break;
   } 
}

//音声認識
const recorder = require('node-record-lpcm16'); //soxをNode.jsから使うためのモジュール
const speech = require('@google-cloud/speech'); //Cloud Speech-to-text APIを使うためのモジュール
const client = new speech.SpeechClient();

const recorderConfig = {
  sampleRate: 16000,
	channels: 1,
	threshold: 0,
	endOnSilence: true,
	silence: '3.0',
};

const recognizeSync = (lc) => {
	return new Promise((resolve, reject) => {
		const request = {
			config: {
				encoding: 'LINEAR16',
				sampleRateHertz: 16000,
				languageCode: lc,
			},
			interimResults: false,
		};

		const recording = recorder.record(recorderConfig);

		const recognizeStream = client
			.streamingRecognize(request)
			.on('error', reject)
			.on('end', resolve)
			.on('data', data => {
				process.stdout.write(
					data.results[0] && data.results[0].alternatives[0]
						? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
						: '\n\nReached transcription time limit, press Ctrl+C\n'
				)
				resolve(data.results[0].alternatives[0].transcript);
				recording.stop();
			});

		recording.stream()
						 .on('error', reject)
						 .pipe(recognizeStream);
	})
}

//双方向通信

var io = socketio(server);

io.sockets.on('connection', function (socket) {
  socket.on('VOICE_REC', () => {
    console.log("Start Voice Recognition");
    voiceRec();
  });
  socket.on('SPEAKING_TO_SERVER', () => {
    //console.log("話す");
    startSpeaking("intro");
  });
  socket.on('SPOKE', () => {
    //console.log("話した");
    syncFlag = true;
  });
  
    socket.on('client_to_server', function (data) {
        io.sockets.emit('server_to_client', { value: data.value });
    });
});

async function voiceRec(){
	(async () => {
		const result = await recognizeSync('en-US');
		if (result != null) {
			console.log(`result : ${result}`);
		} else {
			console.log(`bad recognize, one more time.`);
		}
	})();
}

async function startSpeaking(mode){
  switch (mode) {
    case "intro":
      await doJsonCommands("./data/script.json");
      break;
  }
}

async function doJsonCommands(jsonPath){
  const jsonObject = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  for (const obj of jsonObject) {
    switch (obj.command) {
      case "speak": 
        await speakScript(obj.lang, obj.msg);
        break;
      default: 
        console.log("undefined command : " + obj.command);
    }
  }
}
function speakScript(lang, msg) {
  console.log(msg);
  // console.log(lang);
  return new Promise((resolve) => {
    io.emit("SPEAKING_TO_CLIENT", lang, msg);
    let checkFlagDemon = setInterval(() => {
      if(syncFlag == true){
        syncFlag = false;
        clearInterval(checkFlagDemon);
        resolve("spoke");
      }
    }, 500);
  });
}
