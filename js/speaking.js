let socket = io.connect();
var v = document.getElementById('video');
var count = 1;

//再生バーを消す
jQuery(function($){ v.controls = false; });
    
function play(){ v.play(); }
function pause(){ v.pause(); }

//特定の時間で止まる
v.addEventListener('timeupdate', function() {
    switch (count) {
        case 1:
            if(v.currentTime >= 4){ v.pause(); count++; }
            break;
        case 2:
            if(v.currentTime >= 8){ v.pause(); count++; }
            break;
        case 3:
            if(v.currentTime >= 7){ v.pause(); count++; }
            break;
        case 4:
            if(v.currentTime >= 11){ v.pause(); count++; }
        break;
    }
    //デバッグ用
	console.log(v.currentTime);
});

function start(){ socket.emit("SPEAKING_TO_SERVER"); }

socket.on("SPEAKING_TEST", () => {
    play();
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