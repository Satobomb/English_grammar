var v = document.getElementById('video');

// jQuery(function($){
//     v.controls = false;
// });
    
function play(){ v.play(); }
function pause(){ v.pause(); }

// v.addEventListener('timeupdate', function() {
//     if(v.currentTime >= 5){ v.pause(); }
// 	console.log(v.currentTime);
// });