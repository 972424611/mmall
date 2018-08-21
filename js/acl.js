const urlHead = $.cookie('urlHead');
const token = $.cookie('token');


var aclModuleList; // 存储树形权限模块列表
var aclModuleMap = {}; // 存储map格式权限模块信息
var aclMap = {}; // 存储map格式的权限点信息
var optionStr = "";
var lastClickAclModuleId = -1;

var aclModuleListTemplate = $('#aclModuleListTemplate').html();
Mustache.parse(aclModuleListTemplate);
var aclListTemplate = $('#aclListTemplate').html();
Mustache.parse(aclListTemplate);

loadAclModuleTree();

function loadAclModuleTree() {
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/aclModule/tree",
        success : function (result) {
            if(result.ret) {
                aclModuleList = result.data;
                var rendered = Mustache.render(aclModuleListTemplate, {
                    aclModuleList: result.data,
                    "showDownAngle": function () {
                        return function (text, render) {
                            return (this.aclModuleList && this.aclModuleList.length > 0) ? "" : "hidden";
                        }
                    },
                    "displayClass": function () {
                        return "";
                    }
                });
                $("#aclModuleList").html(rendered);
                recursiveRenderAclModule(result.data);
                bindAclModuleClick();
            } else {
                showMessage("加载权限模块", result.msg, false);
            }
        }
    })
}

$(".aclModule-add").click(function () {
    $("#dialog-aclModule-form").dialog({
        model: true,
        title: "新增权限模块",
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close", $(this).parent()).hide();
            optionStr = "<option value=\"0\">-</option>";
            recursiveRenderAclModuleSelect(aclModuleList, 1);
            $("#aclModuleForm")[0].reset();
            $("#parentId").html(optionStr);
        },
        buttons : {
            "添加": function(e) {
                e.preventDefault();
                updateAclModule(true, function (data) {
                    $("#dialog-aclModule-form").dialog("close");
                }, function (data) {
                    showMessage("新增权限模块", data.msg, false);
                })
            },
            "取消": function () {
                $("#dialog-aclModule-form").dialog("close");
            }
        }
    });
});
function updateAclModule(isCreate, successCallback, failCallback) {
    $.ajax({
        headers: {
            token: token
        },
        url: isCreate ? urlHead + "/sys/aclModule/save" : urlHead + "/sys/aclModule/update",
        data: $("#aclModuleForm").serializeArray(),
        type: 'POST',
        success: function(result) {
            if (result.ret) {
                // 如果是更新需要清空id的缓存，不清空更新后再添加新成员的时候就会报错。
                if(!isCreate) {
                    $("#aclModuleForm")[0].reset();
                    // 隐藏域需要手动设置为空
                    $("#aclModuleId").val("");
                }
                loadAclModuleTree();
                if (successCallback) {
                    successCallback(result);
                }
            } else {
                if (failCallback) {
                    failCallback(result);
                }
            }
        }
    })
}

function updateAcl(isCreate, successCallback, failCallback) {
    $.ajax({
        headers: {
            token: token
        },
        url: isCreate ? urlHead + "/sys/acl/save" : urlHead + "/sys/acl/update",
        data: $("#aclForm").serializeArray(),
        type: 'POST',
        success: function(result) {
            if (result.ret) {
                // 如果是更新需要清空id的缓存，不清空更新后再添加新成员的时候就会报错。
                if(!isCreate) {
                    $("#aclForm")[0].reset();
                    // 隐藏域需要手动设置为空
                    $("#aclId").val("");
                }
                loadAclList(lastClickAclModuleId);
                if (successCallback) {
                    successCallback(result);
                }
            } else {
                if (failCallback) {
                    failCallback(result);
                }
            }
        }
    })
}

function recursiveRenderAclModuleSelect(aclModuleList, level) {
    level = level | 0;
    if (aclModuleList && aclModuleList.length > 0) {
        $(aclModuleList).each(function (i, aclModule) {
            aclModuleMap[aclModule.id] = aclModule;
            var blank = "";
            if (level > 1) {
                for(var j = 3; j <= level; j++) {
                    blank += "..";
                }
                blank += "∟";
            }
            optionStr += Mustache.render("<option value='{{id}}'>{{name}}</option>", {id: aclModule.id, name: blank + aclModule.name});
            if (aclModule.aclModuleList && aclModule.aclModuleList.length > 0) {
                recursiveRenderAclModuleSelect(aclModule.aclModuleList, level + 1);
            }
        });
    }
}

function recursiveRenderAclModule(aclModuleList) {
    if (aclModuleList && aclModuleList.length > 0) {
        $(aclModuleList).each(function (i, aclModule) {
            aclModuleMap[aclModule.id] = aclModule;
            if (aclModule.aclModuleList && aclModule.aclModuleList.length > 0) {
                var rendered = Mustache.render(aclModuleListTemplate, {
                    aclModuleList: aclModule.aclModuleList,
                    "showDownAngle": function () {
                        return function (text, render) {
                            return (this.aclModuleList && this.aclModuleList.length > 0) ? "" : "hidden";
                        }
                    },
                    "displayClass": function () {
                        return "hidden";
                    }
                });
                $("#aclModule_" + aclModule.id).append(rendered);
                recursiveRenderAclModule(aclModule.aclModuleList);
            }
        })
    }
}

function bindAclModuleClick() {
    $(".sub-aclModule").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).parent().parent().parent().children().children(".aclModule-name").toggleClass("hidden");
        if($(this).is(".fa-angle-double-down")) {
            $(this).removeClass("fa-angle-double-down").addClass("fa-angle-double-up");
        } else{
            $(this).removeClass("fa-angle-double-up").addClass("fa-angle-double-down");
        }
    });

    $(".aclModule-name").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var aclModuleId = $(this).attr("data-id");
        handleAclModuleSelected(aclModuleId);
    });

    $(".aclModule-delete").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var aclModuleId = $(this).attr("data-id");
        var aclModuleName = $(this).attr("data-name");
        if (confirm("确定要删除权限模块[" + aclModuleName + "]吗?")) {
            $.ajax({
                headers: {
                    token: token
                },
                url: urlHead + "/sys/aclModule/delete",
                data: {
                    id: aclModuleId
                },
                success: function (result) {
                    if (result.ret) {
                        showMessage("删除权限模块[" + aclModuleName + "]", "操作成功", true);
                        loadAclModuleTree();
                    } else {
                        showMessage("删除权限模块[" + aclModuleName + "]", result.msg, false);
                    }
                }
            });
        }
    });

    $(".aclModule-edit").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var aclModuleId = $(this).attr("data-id");
        $("#dialog-aclModule-form").dialog({
            model: true,
            title: "编辑权限模块",
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                optionStr = "<option value=\"0\">-</option>";
                recursiveRenderAclModuleSelect(aclModuleList, 1);
                $("#aclModuleForm")[0].reset();
                $("#parentId").html(optionStr);
                $("#aclModuleId").val(aclModuleId);
                var targetAclModule = aclModuleMap[aclModuleId];
                if (targetAclModule) {
                    $("#parentId").val(targetAclModule.parentId);
                    $("#aclModuleName").val(targetAclModule.name);
                    $("#aclModuleSeq").val(targetAclModule.seq);
                    $("#aclModuleRemark").val(targetAclModule.remark);
                    $("#aclModuleStatus").val(targetAclModule.status);
                }
            },
            buttons : {
                "更新": function(e) {
                    e.preventDefault();
                    updateAclModule(false, function (data) {
                        $("#dialog-aclModule-form").dialog("close");
                    }, function (data) {
                        showMessage("编辑权限模块", data.msg, false);
                    })
                },
                "取消": function () {
                    $("#dialog-aclModule-form").dialog("close");
                }
            }
        });
    });
}

function handleAclModuleSelected(aclModuleId) {
    if (lastClickAclModuleId != -1) {
        var lastAclModule = $("#aclModule_" + lastClickAclModuleId + " .dd2-content:first");
        lastAclModule.removeClass("btn-yellow");
        lastAclModule.removeClass("no-hover");
    }
    var currentAclModule = $("#aclModule_" + aclModuleId + " .dd2-content:first");
    currentAclModule.addClass("btn-yellow");
    currentAclModule.addClass("no-hover");
    lastClickAclModuleId = aclModuleId;
    loadAclList(aclModuleId);
}

function loadAclList(aclModuleId) {
    var pageSize = $("#pageSize").val();
    var url = urlHead + "/sys/acl/page?aclModuleId=" + aclModuleId;
    var pageNo = $("#aclPage .pageNo").val() || 1;
    $.ajax({
        headers: {
            token: token
        },
        url : url,
        data: {
            pageSize: pageSize,
            pageNo: pageNo
        },
        success: function (result) {
            renderAclListAndPage(result, url);
        }
    })
}

function renderAclListAndPage(result, url) {
    if(result.ret) {
        if (result.data.total > 0){
            var rendered = Mustache.render(aclListTemplate, {
                aclList: result.data.data,
                "showAclModuleName": function () {
                    return aclModuleMap[this.aclModuleId].name;
                },
                "showStatus": function() {
                    return this.status == 1 ? "有效": "无效";
                },
                "showType": function() {
                    return this.type == 1 ? "菜单" : (this.type == 2 ? "按钮" : "其他");
                },
                "bold": function() {
                    return function(text, render) {
                        var status = render(text);
                        if (status == '有效') {
                            return "<span class='label label-sm label-success'>有效</span>";
                        } else if(status == '无效') {
                            return "<span class='label label-sm label-warning'>无效</span>";
                        } else {
                            return "<span class='label'>删除</span>";
                        }
                    }
                }
            });
            $("#aclList").html(rendered);
            bindAclClick();
            $.each(result.data.data, function(i, acl) {
                aclMap[acl.id] = acl;
            })
        } else {
            $("#aclList").html('');
        }
        var pageSize = $("#pageSize").val();
        var pageNo = $("#aclPage .pageNo").val() || 1;
        renderPage(url, result.data.total, pageNo, pageSize, result.data.total > 0 ? result.data.data.length : 0, "aclPage", renderAclListAndPage);
    } else {
        showMessage("获取权限点列表", result.msg, false);
    }
}

function bindAclClick() {
    $(".acl-role").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var aclId = $(this).attr("data-id");
        $.ajax({
            headers: {
                token: token
            },
            url: urlHead + "/sys/acl/acls",
            data: {
                aclId: aclId
            },
            success: function(result) {
                if (result.ret) {
                    console.log(result)
                } else {
                    showMessage("获取权限点分配的用户和角色", result.msg, false);
                }
            }
        })
    });
    $(".acl-edit").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var aclId = $(this).attr("data-id");
        $("#dialog-acl-form").dialog({
            model: true,
            title: "编辑权限",
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                optionStr = "";
                recursiveRenderAclModuleSelect(aclModuleList, 1);
                $("#aclForm")[0].reset();
                $("#aclModuleSelectId").html(optionStr);
                var targetAcl = aclMap[aclId];
                if (targetAcl) {
                    $("#aclId").val(aclId);
                    $("#aclModuleSelectId").val(targetAcl.aclModuleId);
                    $("#aclStatus").val(targetAcl.status);
                    $("#aclType").val(targetAcl.type);
                    $("#aclName").val(targetAcl.name);
                    $("#aclUrl").val(targetAcl.url);
                    $("#aclSeq").val(targetAcl.seq);
                    $("#aclRemark").val(targetAcl.remark);
                }
            },
            buttons : {
                "更新": function(e) {
                    e.preventDefault();
                    updateAcl(false, function (data) {
                        $("#dialog-acl-form").dialog("close");
                    }, function (data) {
                        showMessage("编辑权限", data.msg, false);
                    })
                },
                "取消": function () {
                    $("#dialog-acl-form").dialog("close");
                }
            }
        });
    })
}

$(".acl-add").click(function() {
    $("#dialog-acl-form").dialog({
        model: true,
        title: "新增权限",
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close", $(this).parent()).hide();
            optionStr = "";
            recursiveRenderAclModuleSelect(aclModuleList, 1);
            $("#aclForm")[0].reset();
            $("#aclModuleSelectId").html(optionStr);
        },
        buttons : {
            "添加": function(e) {
                e.preventDefault();
                updateAcl(true, function (data) {
                    $("#dialog-acl-form").dialog("close");
                }, function (data) {
                    showMessage("新增权限", data.msg, false);
                })
            },
            "取消": function () {
                $("#dialog-acl-form").dialog("close");
            }
        }
    });
});