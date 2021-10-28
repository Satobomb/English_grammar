var page = 1;
var allText = document.getElementById('allText1').getElementsByTagName('div');
var _tts;
var _lang;
var jaText = "彼は野球が上手だよ。"; //一時的
var enText = "he plays baseball very well."; //一時的

function clickBtnNext(){     //ページを進める
    if(page >= allText.length) return;
    for(var i=1; i<allText.length; i++) {
        if(i == page){
            allText[i-1].style.display = "none";
            allText[i].style.display = "block";
        }
    }
    page++;
}
function clickBtnBack(){    //ページを戻す
    if(page <= 1) return;
    for(var i=2; i<=allText.length; i++) {
        if(i == page){
            allText[i-1].style.display = "none";
            allText[i-2].style.display = "block";
        }
    }
    page--;
}
allText[0].style.display = "block"; //1ページ目を表示

//↓Naoを動かす用
/*
var session = new QiSession("192.168.1.14:80");
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
        ALMemory.subscriber("FrontTactilTouched").done(function (subscriber) {
            // subscriber.signal is a signal associated to "FrontTactilTouched"
            subscriber.signal.connect(function (state) {
                console.log(state == 1 ? "You just touched my head!" : "Bye bye!");
            });
        });
    });

    function speakJapanese(){   
        var text = jaText;
        console.log(text);
        _tts.setLanguage("Japanese").done().fail(function (error) { //言語の設定
            console.log("An error occurred: " + error);
        });
        _tts.say(text);
    }
    
    function speakEnglish(){   
        var text = enText;
        console.log(text);
        _tts.setLanguage("English").done().fail(function (error) { //言語の設定
            console.log("An error occurred: " + error);
        });
        _tts.say(text);
    }
*/
    function moveScreen(screenNum){
        allText[page-1].style.display = "none";
        //console.log(screenNum);
        switch (screenNum){
            case 1:
                allText = document.getElementById('allText1').getElementsByTagName('div');
                break;
            case 2:
                allText = document.getElementById('allText2').getElementsByTagName('div');
                break;
            case 3:
                allText = document.getElementById('allText3').getElementsByTagName('div');
                break;
        }
        allText[0].style.display = "block"; //1ページ目を表示
        page = 1; //ページ変数を初期化
    }