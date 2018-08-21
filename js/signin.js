
$.cookie('urlHead', 'http://localhost:8080');
const urlHead = $.cookie('urlHead');

function signIn() {
    let username = $("input[name='username']").val();
    let password = $("input[name='password']").val();
    $.ajax({
        url: urlHead + "/user/login",
        type: "GET",
        dataType: "json",
        data: {username: username, password: password},
        success: function (result) {
            if(result.ret !== true) {
                alert(result.msg);
            } else {
                //保存token用来判断用户是否登录，和身份是否属实
                $.cookie('token', result.data);
                if(result.retPage !== undefined) {
                    window.location.href = result.retPage;
                } else {
                    window.location.href = "admin.html";
                }
            }
        }
    })
}