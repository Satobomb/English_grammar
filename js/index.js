var _tts;
var _lang;
var _alMemory;
var _as;
var socket = io.connect();

socket.on("SPEAKING_TO_CLIENT", (lang, msg) => {
    speech(lang, msg);
});
socket.on("DISPLAY_TO_CLIENT", (text) => {
    $('#scripts').html('');
    $('#scripts').html(text);
});

function start(mode){
    switch (mode){
        case "first":
            socket.emit("SPEAKING_TO_SERVER");
            break;
        case "second":
            socket.emit("SPEAKING_TO_SERVER2");
            break;
        case "third":
            socket.emit("SPEAKING_TO_SERVER3");
            break;
    }
}
// function voiceRecSt(){
//     socket.emit("VOICE_REC");
// }

//↓Naoを動かす用

var session = new QiSession("192.168.1.9:80");
    session.socket().on('connect', function () {
        console.log('QiSession connected!');
        // now you can start using your QiSession
    }).on('disconnect', function () {
        console.log('QiSession disconnected!');
    });

session.service("ALTextToSpeech").done((tts) => {
    _tts = tts;   
    _tts.getLanguage().done(function (lang) { //言語の取得
        console.log("language is " + lang + " now");
        _lang = lang;
    }).fail(function (error) {
        console.log("An error occurred: " + error);
    });
        
}).fail((error) => {
    console.log("An error occurred: " + error);
});

var signalLink;
var serviceDirectory;

function onServiceAdded(serviceId, serviceName){
    console.log("New service", serviceId, serviceName);
    serviceDirectory.serviceAdded.disconnect(signalLink);
}

session.service("ServiceDirectory").done(function (sd) {
    serviceDirectory = sd;
    serviceDirectory.serviceAdded.connect(onServiceAdded).done(function (link) {
        signalLink = link;
    }).fail(function (error) {
        console.log("An error occurred: " + error);
    });
});

session.service("ALMemory").done(function (ALMemory) {
    _alMemory = ALMemory;
    _alMemory.subscriber("FrontTactilTouched").done(function (subscriber) {
        // subscriber.signal is a signal associated to "FrontTactilTouched"
        subscriber.signal.connect(function (state) {
            console.log(state == 1 ? "You just touched my head!" : "Bye bye!");
        });
    });
    _alMemory.subscriber("ALAnimatedSpeech/EndOfAnimatedSpeech").then(function (subscriber) {
        subscriber.signal.connect(function (id) {
            //await sleep(1000);
            socket.emit('SPOKE');
        });
    });
});

session.service("ALAnimatedSpeech").done(function (as) {
    _as = as;
});

function speech(lang, msg){   
    console.log(msg);
    //console.log(lang);
    _tts.setLanguage(lang).done().fail(function (error) { //言語の設定
        console.log("An error occurred: " + error);
    });
    _as.say(msg);
    //_tts.say(msg);
    //socket.emit("SPOKE");
}
