let socket = io.connect();

socket.on("DISPLAY_SENTENCES", (text) => {
    $('#sentences').html('');
    $('#sentences').html(text);
});
socket.on("BACK_TO_TOPPAGE", () => {
    location.href = "/";
});

function start(){ socket.emit("WRITING_TO_SERVER"); }

function clickButton(){
    const text = document.Form.textBox.value;
    if(text != ""){
        document.Form.textBox.value = "";
        socket.emit('ANSWERED', (text));
    }
}