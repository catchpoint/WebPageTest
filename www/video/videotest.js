function ValidateInput(form) {
    return true;
}

function AddUrl() {
    var id = parseInt($("#nextid").val(), 10);

    var html = "<div id='urldiv" + id + "' class='urldiv'>";
    html += "<label for='label" + id + "'>Label</label> <input id='label" + id + "' type='text' name='label[" + id + "]'> ";
    html += "<label for='url" + id + "'>URL</label> <input id='url" + id + "' type='text' name='url[" + id + "]'  onkeypress='if (event.keyCode == 32) {return false;}'> ";
    html += "<a href='#' onClick='return RemoveUrl(\"#urldiv" + id + "\");'>Remove</a>";
    html += "</div>";
    $("#urls").append(html);

    $("#nextid").val(id + 1);

    return false;
}

function RemoveUrl(id) {
    $(id).remove();
    return false;
}