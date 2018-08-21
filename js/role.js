const urlHead = $.cookie('urlHead');
const token = $.cookie('token');

var roleMap = {};
var lastRoleId = -1;
var selectFirstTab = true;
var hasMultiSelect = false;

var roleListTemplate = $("#roleListTemplate").html();
Mustache.parse(roleListTemplate);
var selectedUsersTemplate = $("#selectedUsersTemplate").html();
Mustache.parse(selectedUsersTemplate);
var unSelectedUsersTemplate = $("#unSelectedUsersTemplate").html();
Mustache.parse(unSelectedUsersTemplate);

loadRoleList();

// zTree
<!-- 树结构相关 开始 -->
var zTreeObj = [];
var modulePrefix = 'm_';
var aclPrefix = 'a_';
var nodeMap = {};

var setting = {
    check: {
        enable: true,
        chkDisabledInherit: true,
        chkboxType: {"Y": "ps", "N": "ps"}, //auto check 父节点 子节点
        autoCheckTrigger: true
    },
    data: {
        simpleData: {
            enable: true,
            rootPId: 0
        }
    },
    callback: {
        onClick: onClickTreeNode
    }
};

function onClickTreeNode(e, treeId, treeNode) { // 绑定单击事件
    var zTree = $.fn.zTree.getZTreeObj("roleAclTree");
    zTree.expandNode(treeNode);
}

function loadRoleList() {
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/role/list",
        success: function (result) {
            if (result.ret) {
                var rendered = Mustache.render(roleListTemplate, {roleList: result.data});
                $("#roleList").html(rendered);
                bindRoleClick();
                $.each(result.data, function(i, role) {
                    roleMap[role.id] = role;
                });
            } else {
                showMessage("加载角色列表", result.msg, false);
            }
        }
    });
}
function bindRoleClick() {
    $(".role-edit").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var roleId = $(this).attr("data-id");
        $("#dialog-role-form").dialog({
            model: true,
            title: "修改角色",
            open: function(event, ui) {
                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                $("#roleForm")[0].reset();
                var targetRole = roleMap[roleId];
                if (targetRole) {
                    $("#roleId").val(roleId);
                    $("#roleName").val(targetRole.name);
                    $("#roleStatus").val(targetRole.status);
                    $("#roleRemark").val(targetRole.remark);
                }
            },
            buttons : {
                "修改": function(e) {
                    e.preventDefault();
                    updateRole(false, function (data) {
                        $("#dialog-role-form").dialog("close");
                    }, function (data) {
                        showMessage("修改角色", data.msg, false);
                    })
                },
                "取消": function () {
                    $("#dialog-role-form").dialog("close");
                }
            }
        })
    });
    $(".role-name").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var roleId = $(this).attr("data-id");
        handleRoleSelected(roleId);
    });
}

function handleRoleSelected(roleId) {
    if (lastRoleId != -1) {
        var lastRole = $("#role_" + lastRoleId + " .dd2-content:first");
        lastRole.removeClass("btn-yellow");
        lastRole.removeClass("no-hover");
    }
    var currentRole = $("#role_" + roleId + " .dd2-content:first");
    currentRole.addClass("btn-yellow");
    currentRole.addClass("no-hover");
    lastRoleId = roleId;

    $('#roleTab a:first').trigger('click');
    if (selectFirstTab) {
        loadRoleAcl(roleId);
    }
}

function loadRoleAcl(selectedRoleId) {
    if (selectedRoleId == -1) {
        return;
    }
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/role/roleTree",
        data : {
            roleId: selectedRoleId
        },
        type: 'POST',
        success: function (result) {
            if (result.ret) {
                renderRoleTree(result.data);
            } else {
                showMessage("加载角色权限数据", result.msg, false);
            }
        }
    });
}

function getTreeSelectedId() {
    var treeObj = $.fn.zTree.getZTreeObj("roleAclTree");
    var nodes = treeObj.getCheckedNodes(true);
    var v = "";
    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].id.startsWith(aclPrefix)) {
            v += "," + nodes[i].dataId;
        }
    }
    return v.length > 0 ? v.substring(1): v;
}

function renderRoleTree(aclModuleList) {
    zTreeObj = [];
    recursivePrepareTreeData(aclModuleList);
    for(var key in nodeMap) {
        zTreeObj.push(nodeMap[key]);
    }
    $.fn.zTree.init($("#roleAclTree"), setting, zTreeObj);
}

function recursivePrepareTreeData(aclModuleList) {
    // prepare nodeMap
    if (aclModuleList && aclModuleList.length > 0) {
        $(aclModuleList).each(function(i, aclModule) {
            var hasChecked = false;
            if (aclModule.aclList && aclModule.aclList.length > 0) {
                $(aclModule.aclList).each(function(i, acl) {
                    zTreeObj.push({
                        id: aclPrefix + acl.id,
                        pId: modulePrefix + acl.aclModuleId,
                        name: acl.name + ((acl.type == 1) ? '(菜单)' : ''),
                        chkDisabled: !acl.hasAcl,
                        checked: acl.checked,
                        dataId: acl.id
                    });
                    if(acl.checked) {
                        hasChecked = true;
                    }
                });
            }
            if ((aclModule.aclModuleList && aclModule.aclModuleList.length > 0) ||
                (aclModule.aclList && aclModule.aclList.length > 0)) {
                nodeMap[modulePrefix + aclModule.id] = {
                    id : modulePrefix + aclModule.id,
                    pId: modulePrefix + aclModule.parentId,
                    name: aclModule.name,
                    open: hasChecked
                };
                var tempAclModule = nodeMap[modulePrefix + aclModule.id];
                while(hasChecked && tempAclModule) {
                    if(tempAclModule) {
                        nodeMap[tempAclModule.id] = {
                            id: tempAclModule.id,
                            pId: tempAclModule.pId,
                            name: tempAclModule.name,
                            open: true
                        }
                    }
                    tempAclModule = nodeMap[tempAclModule.pId];
                }
            }
            recursivePrepareTreeData(aclModule.aclModuleList);
        });
    }
}

$(".role-add").click(function () {
    $("#dialog-role-form").dialog({
        model: true,
        title: "新增角色",
        open: function(event, ui) {
            $(".ui-dialog-titlebar-close", $(this).parent()).hide();
            $("#roleForm")[0].reset();
        },
        buttons : {
            "添加": function(e) {
                e.preventDefault();
                updateRole(true, function (data) {
                    $("#dialog-role-form").dialog("close");
                }, function (data) {
                    showMessage("新增角色", data.msg, false);
                })
            },
            "取消": function () {
                $("#dialog-role-form").dialog("close");
            }
        }
    })
});

$(".saveRoleAcl").click(function (e) {
    e.preventDefault();
    if (lastRoleId == -1) {
        showMessage("保存角色与权限点的关系", "请现在左侧选择需要操作的角色", false);
        return;
    }
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/role/changeAcls",
        data: {
            roleId: lastRoleId,
            aclIds: getTreeSelectedId()
        },
        type: 'POST',
        success: function (result) {
            if (result.ret) {
                showMessage("保存角色与权限点的关系", "操作成功", false);
            } else {
                showMessage("保存角色与权限点的关系", result.msg, false);
            }
        }
    });
});

function updateRole(isCreate, successCallback, failCallback) {
    $.ajax({
        headers: {
            token: token
        },
        url: isCreate ? urlHead + "/sys/role/save" : urlHead + "/sys/role/update",
        data: $("#roleForm").serializeArray(),
        type: 'POST',
        success: function(result) {
            if (result.ret) {
                loadRoleList();
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
$("#roleTab a[data-toggle='tab']").on("shown.bs.tab", function(e) {
    if(lastRoleId == -1) {
        showMessage("加载角色关系","请先在左侧选择操作的角色", false);
        return;
    }
    if (e.target.getAttribute("href") == '#roleAclTab') {
        selectFirstTab = true;
        loadRoleAcl(lastRoleId);
    } else {
        selectFirstTab = false;
        loadRoleUser(lastRoleId);
    }
});

function loadRoleUser(selectedRoleId) {
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/role/users",
        data: {
            roleId: selectedRoleId
        },
        type: 'POST',
        success: function (result) {
            if (result.ret) {
                var renderedSelect = Mustache.render(selectedUsersTemplate, {userList: result.data.selected});
                var renderedUnSelect = Mustache.render(unSelectedUsersTemplate, {userList: result.data.unselected});
                $("#roleUserList").html(renderedSelect + renderedUnSelect);

                if(!hasMultiSelect) {
                    $('select[name="roleUserList"]').bootstrapDualListbox({
                        showFilterInputs: false,
                        moveOnSelect: false,
                        infoText: false
                    });
                    hasMultiSelect = true;
                } else {
                    $('select[name="roleUserList"]').bootstrapDualListbox('refresh', true);
                }
            } else {
                showMessage("加载角色用户数据", result.msg, false);
            }
        }
    });
}

$(".saveRoleUser").click(function (e) {
    e.preventDefault();
    if (lastRoleId == -1) {
        showMessage("保存角色与用户的关系", "请现在左侧选择需要操作的角色", false);
        return;
    }
    $.ajax({
        headers: {
            token: token
        },
        url: urlHead + "/sys/role/changeUsers",
        data: {
            roleId: lastRoleId,
            userIds: $("#roleUserList").val() ? $("#roleUserList").val().join(",") : ''
        },
        type: 'POST',
        success: function (result) {
            if (result.ret) {
                showMessage("保存角色与用户的关系", "操作成功", false);
            } else {
                showMessage("保存角色与用户的关系", result.msg, false);
            }
        }
    });
});
