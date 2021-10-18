var page = 1;
var allText = document.getElementById('allText').getElementsByTagName('div');

function clickBtnNext(){    
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
function clickBtnBack(){    
    if(page <= 1) return;
    for(var i=2; i<=allText.length; i++) {
        if(i == page){
            allText[i-1].style.display = "none";
            allText[i-2].style.display = "block";
        }
    }
    page--;
}
allText[0].style.display = "block";