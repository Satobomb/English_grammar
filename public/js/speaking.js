let socket = io.connect();
let v = document.getElementById('video');
let count = 1;
let speakFlag = false;

//再生バーを消す
jQuery(function($){ v.controls = false; });
    
function play(){ v.play(); }
function pause(){ v.pause(); }
function start(){ socket.emit("SPEAKING_TO_SERVER"); }

//時間指定で停止
v.addEventListener('timeupdate', function() {
    switch (count) {
        case 1:
            if(v.currentTime >= 4){ v.pause(); count++; socket.emit("SPOKE_MOVIE"); }
            break;
        case 2:
            if(v.currentTime >= 8){ v.pause(); count++; socket.emit("SPOKE_MOVIE"); }
            break;
        case 3:
            if(v.currentTime >= 7){ v.pause(); count++; socket.emit("SPOKE_MOVIE"); }
            break;
        case 4:
            if(v.currentTime >= 11){ v.pause(); count++; socket.emit("SPOKE_MOVIE"); }
            break;
        case 5:
            if(v.currentTime >= 17){ v.pause(); count++; socket.emit("SPOKE_MOVIE"); }
            break;
    }
    //デバッグ用
	console.log(v.currentTime);
});

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
socket.on("BACK_TO_TOPPAGE", () => {
    location.href = "/";
});