var socketio = require('socket.io');
let http = require("http");
let fs = require("fs");
let server = http.createServer();
let syncFlag = false;
let miss_arr = [];
let arr_len = 4;

for(let i = 0;i<arr_len;i++) miss_arr[i] = 0; //1が正解、0が不正解

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
						//? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
            ? `${data.results[0].alternatives[0].transcript}\n`
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
  // socket.on('VOICE_REC', () => {
  //   voiceRec();
  // });
  socket.on('SPEAKING_TO_SERVER', () => {
    startSpeaking("first");
  });
  socket.on('SPEAKING_TO_SERVER2', () => {
    startSpeaking("second");
  });
  socket.on('SPEAKING_TO_SERVER3', () => {
    startSpeaking("third");
  });
  socket.on('SPOKE', () => {
    syncFlag = true;
  });
  
    socket.on('client_to_server', function (data) {
        io.sockets.emit('server_to_client', { value: data.value });
    });
});

// function setText(){
//   const jsonItem = JSON.parse(fs.readFileSync("./data/set_text.json", "utf-8"));
//   for(const item of jsonItem){
//     io.emit("DISPLAY_TO_CLIENT", item.txt);
//   }
// }

	async function voiceRec(){
		const result = await recognizeSync('en-US');
		if   (result != null) return result;
		else console.log(`bad recognize, one more time.`);
	}

async function startSpeaking(mode){
  switch (mode) {
    case "first":
      //await doJsonCommands("./data/script.json");
      await firstInteraction();
      break;
    case "second":
      await secondInteraction();
      break;
    case "third":
      await thirdInteraction();
      break;
  }
}

async function doJsonCommands(jsonPath){
  const jsonObject = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  for (const obj of jsonObject) await speakScript(obj.lang, obj.msg);
}
function speakScript(lang, msg) {
  console.log(msg);
  return new Promise((resolve) => {
    io.emit("SPEAKING_TO_CLIENT", lang, msg);
    let checkFlagDemon = setInterval(() => {
      if(syncFlag == true){
        syncFlag = false;
        clearInterval(checkFlagDemon);
        resolve();
      }
    }, 500);
  });
}
async function firstInteraction(){
  const jsonObject = JSON.parse(fs.readFileSync("./data/first_interaction.json", "utf-8"));
  let count = 0;
  for (const obj of jsonObject) { 
    io.emit("DISPLAY_TO_CLIENT", obj.txt);
    //if(obj.exception == "no"){
      await speakScript(obj.lang, obj.msg);
      const result = await voiceRec();
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) miss_arr[count] = 1;
      }
    // }else if(obj.exception == "yes"){
    //   const result = await voiceRec();
    //   const words = result.split(" ");
    //   for(const data of words){
    //     if(data === obj.key) miss_arr[count] = 1;
    //   }
    //   await speakScript(obj.lang, obj.msg);
    // }
    count++;
    console.log(miss_arr);
  }
  //speakScript("Japanese", "お疲れさま、最初のインタラクションは終わりだよ。");
}
async function secondInteraction(){
  //await speakScript("Japanese", "２回目のインタラクションを始めるよ。");
  const jsonObject = JSON.parse(fs.readFileSync("./data/second_interaction.json", "utf-8"));
  let count = 0;
  let correctFlag = 0;
  miss_arr = [0,1,0,1];
  console.log(miss_arr);
  for (const obj of jsonObject) {
    if(count != obj.num) {
      //console.log("continue");
      continue;
    }
    if(obj.part == "A") io.emit("DISPLAY_TO_CLIENT", obj.txt);
    if(miss_arr[count] == 1 && obj.part == "B"){
      await voiceRec();
      await speakScript(obj.lang, obj.msg);
      count++;
      //speakScript("Japanese", "間違えて話していたかな？");
      //await voiceRec();
      //speakScript("Japanese", "なるほどね、ありがとう！");
      //正解を表示する(4パターン全てを兼ねて)
    }else if(miss_arr[count] == 0 && obj.part == "A"){
      await speakScript(obj.lang, obj.msg);
      const result = await voiceRec();
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) correctFlag = 1;
      }
      if(correctFlag == 0){
        await speakScript("Japanese", "間違えて発話していたよ。");
        await speakScript("Japanese", "正しい発話はこんな感じだよ。");
        await speakScript(obj.lang, obj.correctText);
      }else if(correctFlag == 1){
        await speakScript("Japanese", "良くできていたね。この調子で頑張ろう。");
        correctFlag = 0;
      }
        count++;
    }
  }
  //console.log("finish");
}
async function thirdInteraction(){
  
}