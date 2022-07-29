let socket = io.connect();

socket.on("DISPLAY_SENTENCES", (text) => {
    $('#sentences').html('');
    $('#sentences').html(text);
});
socket.on("BACK_TO_TOPPAGE", () => {
    location.href = "/";
});

function pre_writingStart(){
    socket.emit("WRITING_TO_SERVER");
}

function clickButton(){
    const text = document.form.textBox.value;
    document.form.textBox.value = "";
    socket.emit('ANSWERED', (text));
}