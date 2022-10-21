var v = document.getElementById('video');

//再生バーを消す
jQuery(function($){
    v.controls = false;
});
    
function play(){ v.play(); }
function pause(){ v.pause(); }

//特定の時間で止まる
v.addEventListener('timeupdate', function() {
    if(v.currentTime >= 5){ v.pause(); }
	console.log(v.currentTime);
});