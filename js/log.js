
var logListTemplate = $('#logListTemplate').html();
Mustache.parse(logListTemplate);
var logMap = {};

loadLogList();

$(".research").click(function (e) {
    e.preventDefault();
    loadLogList();
});

function loadLogList() {
    var pageSize = $("#pageSize").val();
    var pageNo = $("#logPage .pageNo").val() || 1;
    var url = urlHead + "/sys/log/page";
    var beforeSeg = $("#search-before").val();
    var afterSeg = $("#search-after").val();
    var operator = $("#search-operator").val();
    var fromTime = $("#search-from").val();
    var toTime = $("#search-to").val();
    var type = $("#search-type").val();
    $.ajax({
        headers: {
            token: token
        },
        url: url,
        data: {
            pageNo: pageNo,
            pageSize: pageSize,
            beforeSeg: beforeSeg,
            afterSeg : afterSeg,
            operator : operator,
            fromTime: fromTime,
            toTime: toTime,
            type: type
        },
        type: 'POST',
        success: function (result) {
            renderLogListAndPage(result, url);
        }
    });
}

function renderLogListAndPage(result, url) {
    if (result.ret) {
        if (result.data.total > 0) {
            var rendered = Mustache.render(logListTemplate, {
                "logList": result.data.data,
                "showType": function () {
                    return function (text, render) {
                        var typeStr = "";
                        switch (this.type) {
                            case 1: typeStr = "部门";break;
                            case 2: typeStr = "用户";break;
                            case 3: typeStr = "权限模块";break;
                            case 4: typeStr = "权限点";break;
                            case 5: typeStr = "角色";break;
                            case 6: typeStr = "角色权限关系";break;
                            case 7: typeStr = "角色用户关系";break;
                            default: typeStr = "未知";
                        }
                        return typeStr;
                    }
                },
                "showDate" :function () {
                    return function (text, render) {
                        return new Date(this.operateTime).Format("yyyy-MM-dd hh:mm:ss");
                    }
                },
                "showOldValue": function () {
                    return function (text, render) {
                        return this.oldValue ? ((this.type == 6 || this.type == 7) ? this.oldValue : formatJson(this.oldValue)) : '无';
                    }
                },
                "showNewValue": function () {
                    return function (text, render) {
                        return this.newValue ? ((this.type == 6 || this.type == 7) ? this.newValue : formatJson(this.newValue)) : '无';
                    }
                }
            });
            $('#logList').html(rendered);
            $.each(result.data.data, function (i, log) {
                logMap[log.id] = log;
            });
        } else {
            $('#logList').html('');
        }
        bindLogClick();
        var pageSize = $("#pageSize").val();
        var pageNo = $("#logPage .pageNo").val() || 1;
        renderPage(url, result.data.total, pageNo, pageSize, result.data.total > 0 ? result.data.data.length : 0, "logPage", renderLogListAndPage);
    } else {
        showMessage("获取权限操作历史列表", result.msg, false);
    }
}

function bindLogClick() {
    $(".log-edit").click(function (e) {
        e.preventDefault();
        var logId = $(this).attr("data-id"); // 选中的log id
        console.log(logId);
        if (confirm("确定要还原这个操作吗?")) {
            $.ajax({
                headers: {
                    token: token
                },
                url: urlHead + "/sys/log/recover",
                data: {
                    id: logId
                },
                success: function (result) {
                    if (result.ret) {
                        showMessage("还原历史记录", "操作成功", true);
                        loadLogList();
                    } else {
                        showMessage("还原历史记录", result.msg, false);
                    }
                }
            });
        }
    });
}
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};
var formatJson = function(json, options) {
    if(json == '') return '';
    var reg = null,
        formatted = '',
        pad = 0,
        PADDING = '    '; // one can also use '\t' or a different number of spaces

    // optional settings
    options = options || {};
    // remove newline where '{' or '[' follows ':'
    options.newlineAfterColonIfBeforeBraceOrBracket = (options.newlineAfterColonIfBeforeBraceOrBracket === true) ? true : false;
    // use a space after a colon
    options.spaceAfterColon = (options.spaceAfterColon === false) ? false : true;

    // begin formatting...
    if (typeof json !== 'string') {
        // make sure we start with the JSON as a string
        json = JSON.stringify(json);
    } else {
        // is already a string, so parse and re-stringify in order to remove extra whitespace
        json = JSON.parse(json);
        json = JSON.stringify(json);
    }

    // add newline before and after curly braces
    reg = /([\{\}])/g;
    json = json.replace(reg, '\r\n$1\r\n');

    // add newline before and after square brackets
    reg = /([\[\]])/g;
    json = json.replace(reg, '\r\n$1\r\n');

    // add newline after comma
    reg = /(\,)/g;
    json = json.replace(reg, '$1\r\n');

    // remove multiple newlines
    reg = /(\r\n\r\n)/g;
    json = json.replace(reg, '\r\n');

    // remove newlines before commas
    reg = /\r\n\,/g;
    json = json.replace(reg, ',');

    // optional formatting...
    if (!options.newlineAfterColonIfBeforeBraceOrBracket) {
        reg = /\:\r\n\{/g;
        json = json.replace(reg, ':{');
        reg = /\:\r\n\[/g;
        json = json.replace(reg, ':[');
    }
    if (options.spaceAfterColon) {
        reg = /\:/g;
        json = json.replace(reg, ': ');
    }

    $.each(json.split('\r\n'), function(index, node) {
        var i = 0,
            indent = 0,
            padding = '';

        if (node.match(/\{$/) || node.match(/\[$/)) {
            indent = 1;
        } else if (node.match(/\}/) || node.match(/\]/)) {
            if (pad !== 0) {
                pad -= 1;
            }
        } else {
            indent = 0;
        }

        for (i = 0; i < pad; i++) {
            padding += PADDING;
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });
    return formatted;
};