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
// const strComparer = require('./modules/string-comparer');
// const metaphone = require('metaphone');
// /* kuroshiro : Japanese Sentence => Hiragana, Katakana or Romaji */
// const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
// const Kuroshiro = require('kuroshiro');
// const kuroshiro = new Kuroshiro();
// kuroshiro.init(new KuromojiAnalyzer());

for(let i = 0;i < arr_len; i++){
  miss_arr[i] = 0; //1が正解、0が不正解
  miss_arr2[i] = 0;
  miss_arr3[i] = 0;
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

async function voiceRec(language){
  const result = await recognizeSync(language);
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
  console.log(msg); //for debug
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
  await speakScript("Japanese", "今から英語のインタラクションを始めるよ");
  await speakScript("Japanese", "このインタラクションでは、空欄になっている文を君に話してもらいたいな");
  await speakScript("Japanese", "僕と一緒に頑張ろうね");
  await speakScript("Japanese", "それじゃあ、始めるよ！");
  const jsonObject = JSON.parse(fs.readFileSync("./data/first_interaction.json", "utf-8"));
  io.emit("DISPLAY_ANSWER_BLANK");
  let count = 0;
  for (const obj of jsonObject) { 
    io.emit("DISPLAY_TO_CLIENT", obj.txt);
    if(count != 0) await speakScript("Japanese", "次の会話文に行くね");
    await sleep(5000);
    if(obj.ex == 0){
      await speakScript(obj.lang, obj.msg);
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
      await speakScript(obj.lang, obj.msg);
    }
    count++;
    console.log(miss_arr); //for debug
    await sleep(3000);
  }
  speakScript("Japanese", "お疲れさま、最初のインタラクションは終わりだよ。");
}


async function secondInteraction(){
  await speakScript("Japanese", "２回目のインタラクションを始めるよ。");
  const jsonObject = JSON.parse(fs.readFileSync("./data/second_interaction.json", "utf-8"));
  let count = 0;
  let correctFlag = 0;
  let correctFlag2 = 0;
  let correctFlag3 = 0;
  miss_arr = [0,1,0,1]; //for debug
  console.log(miss_arr); //for debug
  for (const obj of jsonObject) {
    if(count != obj.num) continue;
    if(obj.part == "A") io.emit("DISPLAY_TO_CLIENT", obj.txt);
    if(obj.ex == 0){
      if(miss_arr[count] == 1 && obj.part == "B"){
        await voiceRec('en-US');
        await speakScript(obj.lang, obj.msg);
        await sleep(3000);
        await speakScript("Japanese", "僕が話した文は間違えていたかな？間違えがあったら、ある、なかったらないって言ってね。");
        //await speakScript("Japanese", "僕が話した文は間違えていたかな？"); //for debug
        const response = await voiceRec('ja-JP');
        if(response == "ある" || response == "R" || response == "あれ"){
          await speakScript("Japanese", "どういう間違いをしていたかな？");
          await voiceRec('ja-JP');
          await speakScript("Japanese", "正しい発話を教えてほしいな。");
          const result2 = await voiceRec('en-US');
          await speakScript("Japanese", "なるほどね、ありがとう!");
          const words2 = result2.split(" ");
          for(const data2 of words2){
            if(data2 === obj.key) correctFlag2 = 1;
          }
          if(correctFlag2 == 1){
            miss_arr2[count] = 1;
          }else if(correctFlag2 == 0){
            io.emit("DISPLAY_ANSWER", obj.correctText);
            await sleep(5000);
            io.emit("DISPLAY_ANSWER_BLANK");
          }
        }else{
          await speakScript("Japanese", "なかったんだね、わかったよ。");
          if(obj.correct == 1){
            miss_arr2[count] = 1;
          }else if(obj.correct == 0){
            io.emit("DISPLAY_ANSWER", obj.correctText);
            await sleep(5000);
            io.emit("DISPLAY_ANSWER_BLANK");
          }
        }
        console.log(miss_arr2); //for debug
        count++;
      }else if(miss_arr[count] == 0 && obj.part == "A"){
        await speakScript(obj.lang, obj.msg);
        const result = await voiceRec('en-US');
        const words = result.split(" ");
        for(const data of words){
          if(data === obj.key) correctFlag = 1;
        }
        await sleep(3000);
        if(correctFlag == 0){
          await speakScript("Japanese", "間違えて発話していたよ。");
          await speakScript("Japanese", "正しい発話はこんな感じだよ。");
          await speakScript(obj.lang, obj.correctText);
          
        }else if(correctFlag == 1){
          await speakScript("Japanese", "良くできていたね。この調子で頑張ろう。");
          correctFlag = 0;
          miss_arr2[count] = 1;
          console.log(miss_arr2); //for debug
        }
          count++;
      }
    }else if(obj.ex == 1){
      if(miss_arr[count] == 1 && obj.part == "A"){
        await speakScript(obj.lang, obj.msg);
        await voiceRec('en-US');
        await sleep(3000);
        await speakScript("Japanese", "僕が話した文は間違えていたかな？間違えがあったらある、なかったらないって言ってね。");
        //await speakScript("Japanese", "僕が話した文は間違えていたかな？"); //for debug
        const response = await voiceRec('ja-JP');
        if(response == "ある" || response == "R" || response == "あれ"){
          await speakScript("Japanese", "どういう間違いをしていたかな？");
          await voiceRec('ja-JP');
          await speakScript("Japanese", "正しい発話を教えてほしいな。");
          const result3 = await voiceRec('en-US');
          await speakScript("Japanese", "なるほどね、ありがとう!");
          const words3 = result3.split(" ");
          for(const data3 of words3){
            if(data3 === obj.key) correctFlag3 = 1;
          }
          if(correctFlag3 == 1){
            miss_arr2[count] = 1;
          }else if(correctFlag3 == 0){
            io.emit("DISPLAY_ANSWER", obj.correctText);
            await sleep(5000);
            io.emit("DISPLAY_ANSWER_BLANK");
          }
        }else{
          await speakScript("Japanese", "なかったんだね、わかったよ。");
          if(obj.correct == 1){
            miss_arr2[count] = 1;
          }else if(obj.correct == 0){
            io.emit("DISPLAY_ANSWER", obj.correctText);
            await sleep(5000);
            io.emit("DISPLAY_ANSWER_BLANK");
          }
        }
        console.log(miss_arr2); //for debug
        count++;
      }else if(miss_arr[count] == 0 && obj.part == "B"){
        const result = await voiceRec('en-US');
        await speakScript(obj.lang, obj.msg);
        const words = result.split(" ");
        for(const data of words){
          if(data === obj.key) correctFlag = 1;
        }
        await sleep(3000);
        if(correctFlag == 0){
          await speakScript("Japanese", "間違えて発話していたよ。");
          await speakScript("Japanese", "正しい発話はこんな感じだよ。");
          await speakScript(obj.lang, obj.correctText);
        }else if(correctFlag == 1){
          await speakScript("Japanese", "良くできていたね。この調子で頑張ろう。");
          correctFlag = 0;
          miss_arr2[count] = 1;
          console.log(miss_arr2); //for debug
        }
          count++;
      }
    }
  }
  speakScript("Japanese", "お疲れさま、2回目のインタラクションは終わりだよ。");
}


async function thirdInteraction(){
  await speakScript("Japanese", "最後に3回目のインタラクションを始めるよ。");
  const jsonObject = JSON.parse(fs.readFileSync("./data/third_interaction.json", "utf-8"));
  let count = 0;
  let correctFlag = 0;
  miss_arr = [0,1,0,1]; //for debug
  miss_arr2 = [1,0,0,1]; //for debug
  console.log(miss_arr); //for debug
  console.log(miss_arr2); //for debug
  for (const obj of jsonObject) {
    if(miss_arr[count] == 1 && miss_arr2[count] == 1){
      miss_arr3[count] = 1;
      count++;
      continue;
    }
    io.emit("DISPLAY_TO_CLIENT", obj.txt);
    if(obj.ex == 0){
      await voiceRec('en-US');
      await speakScript(obj.lang, obj.msg);
    }else if(obj.ex == 1){
      await speakScript(obj.lang, obj.msg);
      await voiceRec('en-US');
    }
    await speakScript("Japanese", "僕が話した文で間違いはあったかな？");
    const response = await voiceRec('ja-JP');
    if(response == "ある" || response == "R" || response == "あれ"){
      await speakScript("Japanese", "どういう間違いをしていたかな？");
      await voiceRec('ja-JP');
      await speakScript("Japanese", "正しい発話を教えてほしいな。");
      const result = await voiceRec('en-US');
      await speakScript("Japanese", "なるほどね、ありがとう!");
      const words = result.split(" ");
      for(const data of words){
        if(data === obj.key) correctFlag = 1;
      }
      if(correctFlag == 1){
        miss_arr3[count] = 1;
      }else if(correctFlag == 0){
        io.emit("DISPLAY_ANSWER", obj.correctText);
        await sleep(5000);
        io.emit("DISPLAY_ANSWER_BLANK");
      }
    }else{
      await speakScript("Japanese", "なかったんだね、わかったよ。");
      if(obj.correct == 1){
        miss_arr3[count] = 1;
      }else if(obj.correct == 0){
        io.emit("DISPLAY_ANSWER", obj.correctText);
        await sleep(5000);
        io.emit("DISPLAY_ANSWER_BLANK");
      }
    }
    console.log(miss_arr3); //for debug
    count++;
  }
  await speakScript("Japanese", "お疲れさま、これで英文の読みあいは終わりだよ。");
  await speakScript("Japanese", "一緒に話してくれてありがとう！");
} 