const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
let _tts;
let _lang;
let _vol;
let _alMemory;
let _as;
let socket = io.connect();
let signalLink;
let serviceDirectory;

socket.on("SPEAKING_TO_CLIENT", (lang, msg) => {
    speech(lang, msg);
});
socket.on("DISPLAY_SCRIPTS", (text) => {
    $('#scripts').html('');
    $('#scripts').html(text);
});
socket.on("DISPLAY_SCRIPTS_BLANK", () => {
    $('#scripts').html('');
});
socket.on("DISPLAY_ANSWER", (text) => {
    $('#answer').html('');
    $('#answer').html(text);
});
socket.on("DISPLAY_ANSWER_BLANK", () => {
    $('#answer').html('');
});
socket.on("BACK_TO_TOPPAGE", () => {
    location.href = "/";
});

function start(mode){
    switch (mode){
        case "first":
            socket.emit("INTERACTION_TO_SERVER", "first");
            break;
        case "second":
            socket.emit("INTERACTION_TO_SERVER", "second");
            break;
        case "pre-speaking_test":
            socket.emit("SPEAKING_TO_SERVER", "pre");
            break;
        case "post-speaking_test":
            socket.emit("SPEAKING_TO_SERVER", "post");
            break;
    }
}

//Naoを動かす用
let session = new QiSession("192.168.1.42:80");
    session.socket().on('connect', function () {
        console.log('QiSession connected!');
        // now you can start using your QiSession
    }).on('disconnect', function () {
        console.log('QiSession disconnected!');
    });

session.service("ALTextToSpeech").done((tts) => {
    _tts = tts;
    //言語の取得   
    _tts.getLanguage().done(function (lang) { 
        //console.log("language is " + lang + " now");
        _lang = lang;
    }).fail(function (error) {
        console.log("An error occurred: " + error);
    });
    //音量の取得
    _tts.getVolume().done(function (vol) { 
        console.log("volume is " + vol + " now");
        _vol = vol;
    }).fail(function (error) {
        console.log("An error occurred: " + error);
    });

}).fail((error) => {
    console.log("An error occurred: " + error);
});

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
    _alMemory.subscriber("ALAnimatedSpeech/EndOfAnimatedSpeech").then(function (subscriber) {
        subscriber.signal.connect(function () {
            //await sleep(1000);
            socket.emit('SPOKE');
        });
    });
    _alMemory.subscriber("FrontTactilTouched").done(function (subscriber) {
        // subscriber.signal is a signal associated to "FrontTactilTouched"
        subscriber.signal.connect(function (state) {
            console.log(state == 1 ? "You just touched my head!" : "Bye bye!");
        });
    });
});

session.service("ALAnimatedSpeech").done(function (as) {
    _as = as;
}).fail((error) => {
    this.printLog("Error : " + error);
});

function speech(lang, msg){   
    console.log(msg);
    _tts.setLanguage(lang).done().fail(function (error) { //言語の設定
        console.log("An error occurred: " + error);
    });
    if(lang === "Japanese")     _tts.setVolume(0.3);
    else if(lang === "English") _tts.setVolume(1);
    _as.say(msg);
}