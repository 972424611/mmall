//加载顶部下拉菜单
$('#dropdown-top').dropdown();

if(token === undefined) {
    window.location.href = "signin.html";
}

// 设置顶部菜单用户名
$.ajax({
    // 自定义的headers字段，会出现了option请求，在GET请求之前，后台要记得做检验。
    headers: {
        token: token
    },
    url: urlHead + "/sys/user/get",
    type: 'POST',
    dataType: 'json',
    success : function (result) {
        if (result.ret) {
            $("#username").html(result.data.username);
        } else {
            showMessage("用户名显示失败", result.msg, false);
        }
    }
});

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

// 注销，清空所有cookie
function logout() {
    var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
    if(keys) {
        for(var i = keys.length; i--;)
            document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString()
    }
    //返回登录页面
    window.location.href = "signin.html";
}