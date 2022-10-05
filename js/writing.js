const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
let socket = io.connect();

socket.on("DISPLAY_SENTENCES", (text) => {
    $('#sentences').html('');
    $('#sentences').html(text);
});
socket.on("BACK_TO_TOPPAGE", () => {
    location.href = "/";
});

//let btn = document.getElementById("btn");

// window.document.onkeydown = function(event){
//     if (event.key === "Enter") {
//         document.Form.submit();
//     }
// }



function start(mode){
    switch (mode){
        case "writing_test":
            socket.emit("WRITING_TO_SERVER");
            break;
        // case "post-writing_test":
        //     socket.emit("WRITING_TO_SERVER", "post");
        //     break;
    }
}

function clickButton(){
    const text = document.Form.textBox.value;
    if(text != ""){
        document.Form.textBox.value = "";
        socket.emit('ANSWERED', (text));
    }
}