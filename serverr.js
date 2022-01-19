const socketio = require('socket.io');
const http = require("http");
const fs = require("fs");
const server = http.createServer();
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
const arr_len = 4;
let syncFlag = false;
let miss_arr = [];
let miss_arr2 = [];
let miss_arr3 = [];
let miss_arr4 = [];

//const metaphone = import('metaphone');
// /* kuroshiro : Japanese Sentence => Hiragana, Katakana or Romaji */
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
const Kuroshiro = require('kuroshiro');
const kuroshiro = new Kuroshiro();
kuroshiro.init(new KuromojiAnalyzer());

const strComparer = require('./modules/string-comparer');

for(let i = 0;i < arr_len; i++){
  miss_arr[i] = 0; //1が正解、0が不正解
  miss_arr2[i] = 0;
  miss_arr3[i] = 0;
  for(let j = 0;j < arr_len*3; j = j+3){
    miss_arr4[j] = 0;
    miss_arr4[j+1] = 0;
    miss_arr4[j+2] = 0;
  }
} 

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
            ? `学習者: ${data.results[0].alternatives[0].transcript}\n`
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
  socket.on('SPEAKING_TO_SERVER', () => {
    startSpeaking("first");
  });
  socket.on('SPEAKING_TO_SERVER2', () => {
    startSpeaking("second");
  });
  socket.on('SPEAKING_TO_SERVER3', () => {
    startSpeaking("third");
  });
  socket.on('SPEAKING_TO_SERVER4', () => {
    startSpeaking("test");
  });
  socket.on('SPOKE', () => {
    syncFlag = true;
  });
  
    socket.on('client_to_server', function (data) {
        io.sockets.emit('server_to_client', { value: data.value });
    });
});

async function voiceRec(language){
  const result = await recognizeSync(language);
  if   (result != null) return result;
  else console.log(`bad recognize, one more time.`);
}

async function startSpeaking(mode){
  switch (mode) {
    case "first":
      await firstInteraction();
      break;
    case "second":
      await secondInteraction();
      break;
    case "third":
      await thirdInteraction();
      break;
    case "test":
      await test();
      break;
  }
}

async function doJsonCommands(jsonPath){
  const jsonObject = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  for (const obj of jsonObject) await speakScript(obj.lang, obj.msg);
}

function speakScript(lang, msg) {
  console.log("ロボット:" + msg); //for debug
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
  await speakScript("Japanese", "今から英語のインタラクションを始めるよ");
  await speakScript("Japanese", "このインタラクションでは、空欄になっている文を君に話してもらいたいな");
  await speakScript("Japanese", "それじゃあ始めるよ");
  io.emit("DISPLAY_ANSWER_BLANK");
  let count = 0;
  for (const obj of jsonObject) { 
    io.emit("DISPLAY_SCRIPTS", obj.txt);
    if(count != 0) await speakScript("Japanese", "次の会話文に行くね");
    if(obj.ex == 0){
      await sleep(3000);
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) miss_arr[count] = 1;
      }
    }else if(obj.ex == 1){
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) miss_arr[count] = 1;
      }
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
    }
    count++;
    console.log("miss_arr:" + miss_arr); //for debug
    await sleep(3000);
  }
  await speakScript("Japanese", "お疲れさま、最初のインタラクションは終わりだよ。");
  io.emit("DISPLAY_SCRIPTS_BLANK");
}

async function secondInteraction(){
  await speakScript("Japanese", "２回目のインタラクションを始めるよ。");
  await speakScript("Japanese", "このインタラクションでは、さっきと同じように空欄になっている文を君に話してもらいたいな");
  await speakScript("Japanese", "それじゃあ始めるよ");
  const jsonObject = JSON.parse(fs.readFileSync("./data/second_interaction.json", "utf-8"));
  io.emit("DISPLAY_ANSWER_BLANK");
  let count = 0;
  for (const obj of jsonObject) {
    io.emit("DISPLAY_SCRIPTS", obj.txt);
    if(count != 0) await speakScript("Japanese", "次に行くよ");
    if(obj.ex == 0){
      await sleep(3000);
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key || data === obj.key2) miss_arr2[count] = 1;
      }
    }else if(obj.ex == 1){
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key || data === obj.key2) miss_arr2[count] = 1;
      }
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
    }
    await sleep(3000);
    // if(correctFlag == 0){
    //   if(miss_arr[count] == 1){
    //     await speakScript("Japanese", "間違えて発話していたよ。");
    //     await speakScript("Japanese", "正しい発話はこんな感じだよ。");
    //     io.emit("DISPLAY_ANSWER", obj.correctText);
    //     await speakScript(obj.lang, "\\rspd=70\\" + obj.practiceText);
    //     await sleep(5000);
    //     io.emit("DISPLAY_ANSWER_BLANK");
    //   }else if(miss_arr[count] == 0){
    //     await speakScript("Japanese", "間違えて発話していたよ。");
    //     await speakScript("Japanese", "正しい発話はこんな感じだよ。");
    //     io.emit("DISPLAY_ANSWER", obj.correctText);
    //     await speakScript(obj.lang, "\\rspd=70\\" + obj.practiceText);
    //     await sleep(5000);
    //     await speakScript("Japanese", "君はこの分野が苦手みたいだから発話練習をしてみよう！");
    //     await speakScript("Japanese", "僕に続いて発話してみてね");
    //     await speakScript(obj.lang, "\\rspd=70\\" + obj.practiceText);
    //     await voiceRec('en-US');
    //     await speakScript("Japanese", "いい感じだね");
    //     io.emit("DISPLAY_ANSWER_BLANK");
    //   }
    // }else if(correctFlag == 1){
    //   await speakScript("Japanese", "良くできていたね。この調子で頑張ろう。");
    //   correctFlag = 0;
    //   miss_arr2[count] = 1;
    // }
    io.emit("DISPLAY_ANSWER", obj.correctText);
    await sleep(8000);
    io.emit("DISPLAY_ANSWER_BLANK");
    console.log("miss_arr2:" + miss_arr2); //for debug
    count++;
  }
  await speakScript("Japanese", "お疲れさま、2回目のインタラクションは終わりだよ。");
  io.emit("DISPLAY_SCRIPTS_BLANK");
}

async function thirdInteraction(){
  await speakScript("Japanese", "それじゃあ3回目のインタラクションを始めるよ。");
  await speakScript("Japanese", "このインタラクションでは、僕が空欄部分を話すね");
  await speakScript("Japanese", "それじゃあ始めるよ");
  const jsonObject = JSON.parse(fs.readFileSync("./data/third_interaction.json", "utf-8"));
  io.emit("DISPLAY_ANSWER_BLANK");
  let count = 0;
  for (const obj of jsonObject) {
    io.emit("DISPLAY_SCRIPTS", obj.txt);
    if(count != 0) await speakScript("Japanese", "次に行くね");
    if(obj.ex == 0){
      await voiceRec('en-US');
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
    }else if(obj.ex == 1){
      await sleep(3000);
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
      await voiceRec('en-US');
    }
    await sleep(3000);
    // await speakScript("Japanese", "僕が話した文で間違いはあったかな？");
    // const response = await voiceRec('ja-JP');
    // const romaji_response = await kuroshiro.convert(response, {to: "romaji"});
    // console.log(romaji_response);
    // const selected = strComparer.selectSimilarWord(romaji_response, ["aru", "nai"]);
    // if(selected == "aru"){
    //   await speakScript("Japanese", "どういう間違いをしていたかな？");
    //   await voiceRec('ja-JP');
    //   await speakScript("Japanese", "正しい発話を教えてほしいな。");
    //   const result = await voiceRec('en-US');
    //   await speakScript("Japanese", "なるほどね、ありがとう!");
    //   const words = result.split(" ");
    //   for(const data of words){
    //     if(data === obj.key) correctFlag = 1;
    //   }
    //   if(correctFlag == 1){
    //     correctFlag = 0;
    //     miss_arr3[count] = 1;
    //   }else if(correctFlag == 0){
    //     await sleep(3000);
    //     await speakScript("Japanese", "あれ、答えが画面に出てるみたいだよ");
    //     io.emit("DISPLAY_ANSWER", obj.correctText);
    //     await sleep(3000);
    //     await speakScript("Japanese", "なるほど、答えはこんな感じだったのか");
    //     await speakScript("Japanese", "僕も勉強になったよ");
    //     await sleep(8000);
    //     io.emit("DISPLAY_ANSWER_BLANK");
    //   }
    // }else{
    //   await speakScript("Japanese", "なかったんだね、わかったよ。");
    //   if(obj.correct == 1){
    //     miss_arr3[count] = 1;
    //   }else if(obj.correct == 0){
    //     await sleep(3000);
    //     await speakScript("Japanese", "あれ、答えが画面に出てるみたいだよ");
    //     io.emit("DISPLAY_ANSWER", obj.correctText);
    //     await sleep(3000);
    //     await speakScript("Japanese", "なるほど、答えはこんな感じだったのか");
    //     await speakScript("Japanese", "僕も勉強になったよ");
    //     await sleep(8000);
    //     io.emit("DISPLAY_ANSWER_BLANK");
    //   }
    // }
    io.emit("DISPLAY_ANSWER", obj.correctText);
    await sleep(8000);
    io.emit("DISPLAY_ANSWER_BLANK");
    count++;
  }
  await speakScript("Japanese", "お疲れさま、これで3回目のインタラクションは終わりだよ。");
  io.emit("DISPLAY_SCRIPTS_BLANK");
} 

async function test(){
  await speakScript("Japanese", "最後に4回目のインタラクションを始めるよ");
  await speakScript("Japanese", "このインタラクションでは、空欄になっている文を君に話してもらいたいな");
  await speakScript("Japanese", "それじゃあ始めるよ");
  const jsonObject = JSON.parse(fs.readFileSync("./data/test.json", "utf-8"));
  io.emit("DISPLAY_ANSWER_BLANK");
  let count = 0;
  for (const obj of jsonObject) { 
    if(count != 0) await speakScript("Japanese", "次に行くよ");
    io.emit("DISPLAY_SCRIPTS", obj.txt);
    await sleep(8000);
    io.emit("DISPLAY_SCRIPTS", obj.txt2);
    if(obj.ex == 0){
      await sleep(3000);
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) miss_arr4[count] = 1;
      }
    }else if(obj.ex == 1){
      const result = await voiceRec('en-US');
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) miss_arr4[count] = 1;
      }
      await speakScript(obj.lang, "\\rspd=90\\" + obj.msg);
    }
    count++;
    console.log("miss_arr4:" + miss_arr4); //for debug
    await sleep(3000);
  }
  await speakScript("Japanese", "お疲れさま、これで4回目のインタラクションは終わりだよ。");
  //await speakScript("Japanese", "一緒に話してくれてありがとう！");
  io.emit("DISPLAY_SCRIPTS_BLANK");
}