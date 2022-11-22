const socketio = require('socket.io');
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
const strComparer = require('./modules/string-comparer');
const recognizer = require('./modules/recognizer');

const unit_arr = {
  '3単元': 0,
  '過去形': 1,
  '助動詞': 2,
  '受動態': 3,
  '現在完了': 4,
  '現在進行': 5
};

// kuroshiro : Japanese Sentence => Hiragana, Katakana or Romaji
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
const Kuroshiro = require('kuroshiro');
const kuroshiro = new Kuroshiro();
kuroshiro.init(new KuromojiAnalyzer());

// //soxをNode.jsから使うためのモジュール
// const recorder = require('node-record-lpcm16'); 
// //Cloud Speech-to-text APIを使うためのモジュール
// const speech = require('@google-cloud/speech'); 
// const client = new speech.SpeechClient();
// const recorderConfig = {
//   sampleRate: 16000,
// 	channels: 1,
// 	threshold: 0,
// 	endOnSilence: true,
// 	silence: '3.0',
// };
// const recognizeSync = (lc) => {
// 	return new Promise((resolve, reject) => {
// 		const request = {
// 			config: {
// 				encoding: 'LINEAR16',
// 				sampleRateHertz: 16000,
// 				languageCode: lc,
// 			},
// 			interimResults: false,
// 		};
//     const recording = recorder.record(recorderConfig);
// 		const recognizeStream = client
// 			.streamingRecognize(request)
// 			.on('error', reject)
// 			.on('end', resolve)
// 			.on('data', data => {
// 				process.stdout.write(
// 					data.results[0] && data.results[0].alternatives[0]
//             ? `学習者: ${data.results[0].alternatives[0].transcript}\n`
// 						: '\n\nReached transcription time limit, press Ctrl+C\n'
// 				)
// 				resolve(data.results[0].alternatives[0].transcript);
// 				recording.stop();
// 			});
// 		recording.stream()
// 			.on('error', reject)
// 			.pipe(recognizeStream);
// 	})
// }

class CorrectArray {

  constructor(correct_num, correct_arr){
    this.correct_num = correct_num;
    this.correct_arr = correct_arr;
  }

  async pre_writingTest(){
    const jsonObject = JSON.parse(fs.readFileSync('./data/pre-writing_test.json', 'utf-8'));
    for (const obj of jsonObject) {
      io.emit('DISPLAY_SENTENCES', obj.txt);
      await answerCheck();
      if(obj.key == answer) this.correct_num[unit_arr[obj.unit]]++;
      console.log(this.correct_num); //for debug
    }
    console.log('事前筆記テスト終了時 : ' + this.correct_num);
    io.emit('BACK_TO_TOPPAGE');
  }
  async pre_speakingTest(){
    const jsonObject = JSON.parse(fs.readFileSync('./data/pre-speaking_test.json', 'utf-8'));
    io.emit('DISPLAY_ANSWER_BLANK');
    for (const obj of jsonObject) { 
      io.emit('DISPLAY_SCRIPTS', obj.txt);
      await speakCheck();
      console.log("aa");
      const result = await voiceRec('en-US');
      const words = result.split(' ');
      for(const data of words){
        if(data === obj.key) this.correct_num[unit_arr[obj.unit]]++;
      }
      console.log('correct_num:' + this.correct_num); //for debug
    }
    //得意・不得意単元の振り分け(中心より下は不得意・上は得意)
    let tmp_for_sort = (this.correct_num).concat(); //array copy
    let median;
    tmp_for_sort.sort();
    median = tmp_for_sort[tmp_for_sort.length/2];
    for(let i = 0;i < (this.correct_num).length; i++){
      if(this.correct_num[i] >= median) this.correct_arr[i] = 1;
      else                              this.correct_arr[i] = 0;
    }
    console.log('事前発話テスト終了時 : ' + this.correct_num); //for debug
    console.log('得意・不得意 : ' + this.correct_arr); //for debug
    io.emit('BACK_TO_TOPPAGE');
  }
}

class FlagGathering {
  constructor(){
    this.robotSpoke = this.writeAnswer = this.charactorSpoke = this.interactionDone = false;
  }
}
let array = new CorrectArray(Array(6).fill(0), Array(6).fill(0));
let flag = new FlagGathering();
let answer;

app.use(express.static(path.join(__dirname, 'public')));
server.listen(8080);
console.log('Server running …');

//双方向通信
var io = socketio(server);

io.sockets.on('connection', function (socket) {
  socket.on('WRITING_TO_SERVER', () => {
    if     (flag.interactionDone === false)  startSpeaking('pre-writing_test');
    else if(flag.interactionDone === true)   startSpeaking('post-writing_test');
  });
  socket.on('SPEAKING_TO_SERVER', () => {
    startSpeaking('pre-speaking_test');
    // if     (mode === 'pre')  startSpeaking('pre-speaking_test');
    // else if(mode === 'post') startSpeaking('post-speaking_test');
  });
  socket.on('INTERACTION_TO_SERVER', (mode) => {
    if     (mode === 'first')  startSpeaking('first');
    else if(mode === 'second') startSpeaking('second');
  });
  socket.on('SPOKE', () => {
    flag.robotSpoke = true;
  });
  socket.on('ANSWERED', (text) => {
    flag.writeAnswer = true;
    console.log(text);
    answer = text;
  });
  socket.on('SPOKE_MOVIE', () => {
    flag.charactorSpoke = true;
  });
  socket.on('client_to_server', function (data) {
      io.sockets.emit('server_to_client', { value: data.value });
  });
});

async function voiceRec(language){
  const result = await recognizer.recognizeSync(language);
  if   (result != null) return result;
  else console.log(`bad recognize, one more time.`);
}

async function startSpeaking(mode){
  switch (mode) {
    case 'pre-writing_test':
      await array.pre_writingTest();
      break;
    case 'post-writing_test':
      await post_writingTest();
      break;
    case 'pre-speaking_test':
      await array.pre_speakingTest();
      break;
    case 'post-speaking_test':
      await post_speakingTest();
      break;
    case 'first':
      //await doJsonCommands('./data/script.json');
      await firstInteraction();
      break;
    case 'second':
      await secondInteraction();
      break;
  }
}

async function doJsonCommands(jsonPath){
  const jsonObject = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  for (const obj of jsonObject) await speakScript(obj.lang, obj.msg);
}

function speakScript(lang, msg) {
  console.log('ロボット:' + msg); //for debug
  return new Promise((resolve) => {
    io.emit('SPEAKING_TO_CLIENT', lang, msg);
    let checkFlagDemon = setInterval(() => {
      if(flag.robotSpoke == true){
        flag.robotSpoke = false;
        clearInterval(checkFlagDemon);
        resolve();
      }
    }, 500);
  });
}

function answerCheck() {
  return new Promise((resolve) => {
    let checkFlagDemon = setInterval(() => {
      if(flag.writeAnswer == true){
        flag.writeAnswer = false;
        clearInterval(checkFlagDemon);
        resolve();
      }
    }, 500);
  });
}

function speakCheck() {
  return new Promise((resolve) => {
    io.emit('SPEAKING_TEST');
    let checkFlagDemon = setInterval(() => {
      if(flag.robotSpoke == true){
        flag.robotSpoke = false;
        clearInterval(checkFlagDemon);
        resolve();
      }
    }, 500);
  });
}

async function post_writingTest(){
  const jsonObject = JSON.parse(fs.readFileSync('./data/post-writing_test.json', 'utf-8'));
  for (const obj of jsonObject) {
    io.emit('DISPLAY_SENTENCES', obj.txt);
    await answerCheck();
    //console.log(answer); // for debug
    if(obj.key == answer) array.correct_num[unit_arr[obj.unit]]++;
    console.log(array.correct_num); //for debug
  }
  console.log('事後筆記テスト終了時 : ' + array.correct_num);
  io.emit('BACK_TO_TOPPAGE');
}

async function post_speakingTest(){
  const jsonObject = JSON.parse(fs.readFileSync('./data/pre-speaking_test.json', 'utf-8'));
  io.emit('DISPLAY_ANSWER_BLANK');
  for (const obj of jsonObject) { 
    io.emit('DISPLAY_SCRIPTS', obj.txt);
    await io.emit('SPEAKING_TEST');
    const result = await voiceRec('en-US');
    const words = result.split(' ');
    for(const data of words){
      if(data === obj.key) array.correct_num[unit_arr[obj.unit]]++;
    }
    console.log('correct_num:' + array.correct_num); //for debug
  }
}

//インタラクション
async function firstInteraction(){
  //正誤判定の配列
  let first_arr = Array(4).fill(0);
  const jsonObject = JSON.parse(fs.readFileSync('./data/first_interaction.json', 'utf-8'));
  io.emit('DISPLAY_ANSWER_BLANK');
  let count = 0;
  let correctFlag = 0;
  console.log('correct_arr:' + array.correct_arr); //for debug
  for (const obj of jsonObject) {
    io.emit('DISPLAY_SCRIPTS', obj.txt);
    if(count != 0) await speakScript('Japanese', '次に行くよ');
    if(obj.ex == 0){
      await sleep(3000);
      await speakScript(obj.lang, '\\rspd=90\\' + obj.msg);
      const result = await voiceRec('en-US');
      const words = result.split(' ');
      for(const data of words){
        if(data === obj.key || data === obj.key2) correctFlag = 1;
      }
    }else if(obj.ex == 1){
      const result = await voiceRec('en-US');
      const words = result.split(' ');
      for(const data of words){
        if(data === obj.key || data === obj.key2) correctFlag = 1;
      }
      await speakScript(obj.lang, '\\rspd=90\\' + obj.msg);
    }
    //await sleep(3000);
    if(correctFlag == 0){
      if(array.correct_arr[count] == 1){
        await speakScript('Japanese', '間違えて発話していたよ。');
        await speakScript('Japanese', '正しい発話はこんな感じだよ。');
        io.emit('DISPLAY_ANSWER', obj.correctText);
        await speakScript(obj.lang, '\\rspd=70\\' + obj.practiceText);
        //await sleep(2000);
        io.emit('DISPLAY_ANSWER_BLANK');
      }else if(array.correct_arr[count] == 0){
        await speakScript('Japanese', '間違えて発話していたよ。');
        await speakScript('Japanese', '正しい発話はこんな感じだよ。');
        io.emit('DISPLAY_ANSWER', obj.correctText);
        await speakScript(obj.lang, '\\rspd=70\\' + obj.practiceText);
        //await sleep(2000);
        await speakScript('Japanese', '君はこの分野が苦手みたいだから発話練習をしてみよう！');
        await speakScript('Japanese', '僕に続いて発話してみてね');
        await speakScript(obj.lang, '\\rspd=70\\' + obj.practiceText);
        await voiceRec('en-US');
        await speakScript('Japanese', 'いい感じだね');
        await sleep(5000); //tmp
        io.emit('DISPLAY_ANSWER_BLANK');
      }
    }else if(correctFlag == 1){
      await speakScript('Japanese', '良くできていたね。この調子で頑張ろう。');
      correctFlag = 0;
      first_arr[count] = 1;
    }
    console.log('first_arr:' + first_arr); //for debug
    count++;
  }
  await speakScript('Japanese', 'お疲れさま、最初のインタラクションは終わりだよ。');
  io.emit('DISPLAY_SCRIPTS_BLANK');
  //io.emit('BACK_TO_TOPPAGE');
}

async function secondInteraction(){
  //正誤判定の配列
  let second_arr = Array(4).fill(0);
  await speakScript('Japanese', 'それじゃあ2回目のインタラクションを始めるよ。');
  await speakScript('Japanese', 'このインタラクションでは、僕が空欄部分を話すからもし間違えていたら、教えてほしいな');
  await speakScript('Japanese', 'それじゃあ始めるよ');
  const jsonObject = JSON.parse(fs.readFileSync('./data/second_interaction.json', 'utf-8'));
  io.emit('DISPLAY_ANSWER_BLANK');
  let count = 0;
  let correctFlag = 0;
  for (const obj of jsonObject) {
    io.emit('DISPLAY_SCRIPTS', obj.txt);
    if(count != 0) await speakScript('Japanese', 'それじゃあ次に行くね');
    if(obj.ex == 0){
      await voiceRec('en-US');
      await speakScript(obj.lang, '\\rspd=90\\' + obj.msg);
    }else if(obj.ex == 1){
      await sleep(3000);
      await speakScript(obj.lang, '\\rspd=90\\' + obj.msg);
      await voiceRec('en-US');
    }
    await sleep(3000);
    await speakScript('Japanese', '僕が話した文は間違えていたかな？間違えていたら間違ってる、正しかったら正しいって言ってね。');
    const response = await voiceRec('ja-JP');
    const romaji_response = await kuroshiro.convert(response, {to: 'romaji'});
    console.log(romaji_response);
    const selected = strComparer.selectSimilarWord(romaji_response, ['machigatteru', 'tadashii']);
    if(selected == 'machigatteru'){
      await speakScript('Japanese', 'どういう間違いをしていたかな？');
      await voiceRec('ja-JP');
      await speakScript('Japanese', '正しい単語を空欄に埋めて、英文を発話して教えてほしいな');
      const result = await voiceRec('en-US');
      await speakScript('Japanese', 'なるほどね、ありがとう!');
      await sleep(5000);
      const words = result.split(' ');
      for(const data of words){
        if(data === obj.key) correctFlag = 1;
      }
      if(correctFlag == 1){
        correctFlag = 0;
        second_arr[count] = 1;
      }else if(correctFlag == 0){
        await sleep(3000);
        await speakScript('Japanese', 'あれ、答えが画面に出てるみたいだよ');
        io.emit('DISPLAY_ANSWER', obj.correctText);
        await sleep(3000);
        await speakScript('Japanese', 'なるほど、答えはこんな感じだったのか');
        await speakScript('Japanese', '僕も勉強になったよ');
        await sleep(8000);
        io.emit('DISPLAY_ANSWER_BLANK');
      }
    }else{
      await speakScript('Japanese', '間違いはなかったんだね、わかったよ。');
      if(obj.correct == 1){
        second_arr[count] = 1;
      }else if(obj.correct == 0){
        await sleep(3000);
        await speakScript('Japanese', 'あれ、答えが画面に出てるみたいだよ');
        io.emit('DISPLAY_ANSWER', obj.correctText);
        await sleep(3000);
        await speakScript('Japanese', 'なるほど、答えはこんな感じだったのか');
        await speakScript('Japanese', '僕も勉強になったよ');
        await sleep(8000);
        io.emit('DISPLAY_ANSWER_BLANK');
      }
    }
    console.log('second_arr:' + second_arr); //for debug
    count++;
  }
  doneFlag = true;
  await speakScript('Japanese', 'お疲れさま、これで2回目のインタラクションは終わりだよ。');
  io.emit('DISPLAY_SCRIPTS_BLANK');
  io.emit('BACK_TO_TOPPAGE');
} 