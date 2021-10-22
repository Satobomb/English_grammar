var page = 1;
var allText = document.getElementById('allText').getElementsByTagName('div');
var _tts;
var text1 = "hello NAO";//"he plays baseball";//very well."; //he seems to be good at studying too.";

function clickBtnNext(){     //ページを進める
    if(page >= allText.length) return;
    for(var i=1; i<allText.length; i++) {
        if(i == page){
            allText[i-1].style.display = "none";
            allText[i].style.display = "block";
        }
    }
    page++;
    //console.log(page);
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
    }).fail((error) => {
            console.log("An error occurred: " + error);
    });

    var signalLink;
    var serviceDirectory;

    function onServiceAdded(serviceId, serviceName)
    {
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
*/
    function clickBtn(){   
        var text = text1;
        //console.log(text);
        //_tts.say("I play tennis");
        //_tts.say(text);
    }
    