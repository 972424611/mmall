
const token = $.cookie('token');

if(token === undefined) {
    window.location.href = "signin.html";
}

$(document).ready(function () {
    let popstyle = $(".popstyle");
    popstyle.each(function () {
        let tmp = $(this).attr("href");
        $(this).attr("data", tmp);
        $(this).attr("href", "javascript:void(0)");
    });

    popstyle.click(function () {
        if($(this).attr("data") !== '#') {
            $("iframe").attr('src', $(this).attr("data"));
        }
    });


});