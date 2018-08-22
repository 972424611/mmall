
var deptList; // 存储树形部门列表
var deptMap = {}; // 存储map格式的部门信息
var userMap = {}; // 存储map格式的用户信息
var optionStr = "";
var lastClickDeptId = -1;

var deptListTemplate = $('#deptListTemplate').html();
Mustache.parse(deptListTemplate);
var userListTemplate = $('#userListTemplate').html();
Mustache.parse(userListTemplate);

loadDeptTree();

function loadDeptTree() {
    $.ajax({
        // 自定义的headers字段，会出现了option请求，在GET请求之前，后台要记得做检验。
        headers: {
            token: token
        },
        url: urlHead + "/sys/dept/tree",
        type: 'GET',
        dataType: 'json',
        success : function (result) {
            if (result.ret) {
                deptList = result.data;
                var rendered = Mustache.render(deptListTemplate, {deptList: result.data});
                $("#deptList").html(rendered);
                recursiveRenderDept(result.data);
                bindDeptClick();
            } else {
                showMessage("加载部门列表", result.msg, false);
            }
        }
    })
}

// 递归渲染部门树
function recursiveRenderDept(deptList) {
    if(deptList && deptList.length > 0) {
        $(deptList).each(function (i, dept) {
            deptMap[dept.id] = dept;
            if (dept.deptList.length > 0) {
                var rendered = Mustache.render(deptListTemplate, {deptList: dept.deptList});
                $("#dept_" + dept.id).append(rendered);
                recursiveRenderDept(dept.deptList);
            }
        })
    }
}

// 绑定部门点击事件
function bindDeptClick() {
    $(".dept-name").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var deptId = $(this).attr("data-id");
        handleDepSelected(deptId);
    });

    $(".dept-devare").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var deptId = $(this).attr("data-id");
        var deptName = $(this).attr("data-name");
        if (confirm("确定要删除部门[" + deptName + "]吗?")) {
            $.ajax({
                headers: {
                    token: token
                },
                url: urlHead + "/sys/dept/devare",
                data: {
                    id: deptId
                },
                success: function (result) {
                    if (result.ret) {
                        showMessage("删除部门[" + deptName + "]", "操作成功", true);
                        loadDeptTree();
                    } else {
                        showMessage("删除部门[" + deptName + "]", result.msg, false);
                    }
                }
            });
        }
    });

    $(".dept-edit").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var deptId = $(this).attr("data-id");
        $("#dialog-dept-form").dialog({
            model: true,
            title: "编辑部门",
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                optionStr = "<option value=\"0\">-</option>";
                recursiveRenderDeptSelect(deptList, 1);
                $("#deptForm")[0].reset();
                $("#parentId").html(optionStr);
                $("#deptId").val(deptId);
                var targetDept = deptMap[deptId];
                if (targetDept) {
                    $("#parentId").val(targetDept.parentId);
                    $("#deptName").val(targetDept.name);
                    $("#deptSeq").val(targetDept.seq);
                    $("#deptRemark").val(targetDept.remark);
                }
            },
            buttons : {
                "更新": function(e) {
                    e.preventDefault();
                    updateDept(false, function (data) {
                        $("#dialog-dept-form").dialog("close");
                    }, function (data) {
                        showMessage("更新部门", data.msg, false);
                    })
                },
                "取消": function () {
                    $("#dialog-dept-form").dialog("close");
                }
            }
        });
    })
}

function handleDepSelected(deptId) {
    if (lastClickDeptId != -1) {
        var lastDept = $("#dept_" + lastClickDeptId + " .dd2-content:first");
        lastDept.removeClass("btn-yellow");
        lastDept.removeClass("no-hover");
    }
    var currentDept = $("#dept_" + deptId + " .dd2-content:first");
    currentDept.addClass("btn-yellow");
    currentDept.addClass("no-hover");
    lastClickDeptId = deptId;
    loadUserList(deptId);
}

function loadUserList(deptId) {
    var pageSize = $("#pageSize").val();
    var url = urlHead + "/sys/user/page?deptId=" + deptId;
    var pageNo = $("#userPage .pageNo").val() || 1;
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
            renderUserListAndPage(result, url);
        }
    })
}

function renderUserListAndPage(result, url) {
    if (result.ret) {
        if (result.data.total > 0){
            var rendered = Mustache.render(userListTemplate, {
                userList: result.data.data,
                "showDeptName": function() {
                    return deptMap[this.deptId].name;
                },
                "showStatus": function() {
                    return this.status == 1 ? '有效' : (this.status == 0 ? '无效' : '删除');
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
            $("#userList").html(rendered);
            bindUserClick();
            $.each(result.data.data, function(i, user) {
                userMap[user.id] = user;
            })
        } else {
            $("#userList").html('');
        }
        var pageSize = $("#pageSize").val();
        var pageNo = $("#userPage .pageNo").val() || 1;
        renderPage(url, result.data.total, pageNo, pageSize, result.data.total > 0 ? result.data.data.length : 0, "userPage", renderUserListAndPage);
    } else {
        showMessage("获取部门下用户列表", result.msg, false);
    }
}

$(".user-add").click(function() {
    $("#dialog-user-form").dialog({
        model: true,
        title: "新增用户",
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close", $(this).parent()).hide();
            optionStr = "";
            recursiveRenderDeptSelect(deptList, 1);
            $("#userForm")[0].reset();
            $("#deptSelectId").html(optionStr);
        },
        buttons : {
            "添加": function(e) {
                e.preventDefault();
                updateUser(true, function (data) {
                    $("#dialog-user-form").dialog("close");
                    loadUserList(lastClickDeptId);
                }, function (data) {
                    showMessage("新增用户", data.msg, false);
                })
            },
            "取消": function () {
                $("#dialog-user-form").dialog("close");
            }
        }
    });
});
function bindUserClick() {
    $(".user-acl").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var userId = $(this).attr("data-id");
        $.ajax({
            headers: {
                token: token
            },
            url: "/sys/user/acls",
            data: {
                userId: userId
            },
            success: function(result) {
                if (result.ret) {
                    console.log(result)
                } else {
                    showMessage("获取用户权限数据", result.msg, false);
                }
            }
        })
    });
    $(".user-edit").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        var userId = $(this).attr("data-id");
        $("#dialog-user-form").dialog({
            model: true,
            title: "编辑用户",
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                optionStr = "";
                recursiveRenderDeptSelect(deptList, 1);
                $("#userForm")[0].reset();
                $("#deptSelectId").html(optionStr);

                var targetUser = userMap[userId];
                if (targetUser) {
                    $("#deptSelectId").val(targetUser.deptId);
                    $("#userName").val(targetUser.username);
                    $("#userMail").val(targetUser.mail);
                    $("#userTelephone").val(targetUser.telephone);
                    $("#userStatus").val(targetUser.status);
                    $("#userRemark").val(targetUser.remark);
                    $("#userId").val(targetUser.id);
                }
            },
            buttons : {
                "更新": function(e) {
                    e.preventDefault();
                    updateUser(false, function (data) {
                        $("#dialog-user-form").dialog("close");
                        loadUserList(lastClickDeptId);
                    }, function (data) {
                        showMessage("更新用户", data.msg, false);
                    })
                },
                "取消": function () {
                    $("#dialog-user-form").dialog("close");
                }
            }
        });
    });
}

$(".dept-add").click(function() {
    $("#dialog-dept-form").dialog({
        model: true,
        title: "新增部门",
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close", $(this).parent()).hide();
            optionStr = "<option value=\"0\">-</option>";
            recursiveRenderDeptSelect(deptList, 1);
            $("#deptForm")[0].reset();
            $("#parentId").html(optionStr);
        },
        buttons : {
            "添加": function(e) {
                e.preventDefault();
                updateDept(true, function (data) {
                    $("#dialog-dept-form").dialog("close");
                }, function (data) {
                    showMessage("新增部门", data.msg, false);
                })
            },
            "取消": function () {
                $("#dialog-dept-form").dialog("close");
            }
        }
    });
});

function recursiveRenderDeptSelect(deptList, level) {
    level = level | 0;
    if (deptList && deptList.length > 0) {
        $(deptList).each(function (i, dept) {
            deptMap[dept.id] = dept;
            var blank = "";
            if (level > 1) {
                for(var j = 3; j <= level; j++) {
                    blank += "..";
                }
                blank += "∟";
            }
            optionStr += Mustache.render("<option value='{{id}}'>{{name}}</option>", {id: dept.id, name: blank + dept.name});
            if (dept.deptList && dept.deptList.length > 0) {
                recursiveRenderDeptSelect(dept.deptList, level + 1);
            }
        });
    }
}

function updateUser(isCreate, successCallback, failCallback) {
    $.ajax({
        headers: {
            token: token
        },
        url: isCreate ? urlHead + "/sys/user/save" : urlHead + "/sys/user/update",
        data: $("#userForm").serializeArray(),
        type: 'POST',
        success: function(result) {
            if (result.ret) {
                // 如果是更新需要清空id的缓存，不清空更新后再添加新成员的时候就会报错。
                if(!isCreate) {
                    $("#userForm")[0].reset();
                    // 隐藏域需要手动设置为空
                    $("#userId").val("");
                }
                loadDeptTree();
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

function updateDept(isCreate, successCallback, failCallback) {
    $.ajax({
        headers: {
            token: token
        },
        url: isCreate ? urlHead + "/sys/dept/save" : urlHead + "/sys/dept/update",
        data: $("#deptForm").serializeArray(),
        type: 'POST',
        success: function(result) {
            if (result.ret) {
                // 如果是更新需要清空id的缓存，不清空更新后再添加新成员的时候就会报错。
                if(!isCreate) {
                    $("#deptForm")[0].reset();
                    // 隐藏域需要手动设置为空
                    $("#deptId").val("");
                }
                loadDeptTree();
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