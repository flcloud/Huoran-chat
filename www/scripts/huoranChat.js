window.onload = function() {
    window.huoranChat = new HuoranChat();
    huoranChat.init();
};

var HuoranChat = function() {
    this.socket = null;
    this.pc = null;
    this.localStream = null;
    this.users = [];
    this.selfId = null;
    this.targetId = null;
    this.userItems = [];
    this.messageRecords = [];
    this.getUserMedia = (navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);
};

HuoranChat.prototype = {
    init: function() {
        var that = this;

        this.initUI();

        this.socket = io.connect();

        this.socket.on('connect', function() {
            document.getElementById('idInput').focus();
        });

        this.socket.on('onlineUsers', function(users) {
            for (var index in users) {
                that.addUser(users[index]);
            }
        })

        this.socket.on('loginSuccess', that.onLoginSuccess);

        this.socket.on('userLogin', function(id) {
            that.addUser(id);
        });

        this.socket.on('userLogout', function(id) {
            that.removeUser(id);
        })

        this.socket.on('disconnect', that.onDisconnect);

        this.socket.on('loginFailed', function() {
            that.setStatus('Login failed! Please confirm the id and password!');
        });

        this.socket.on('onInvite', function(id, offer) {
            that.initPC();
            that.onInvite(id, offer);
        });

        this.socket.on('onAnswer', function(id, answer) {
            that.onAnswer(id, answer);
        });

        this.socket.on('onicecandidate', function(id, candidate) {
            if (candidate != null && candidate != undefined) {
                that.pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('recieved candidate from ' + id);
                console.log(candidate);
            }
        });

        this.socket.on('onMessage', that.onMessage);

        this.socket.on('sendMsgFailed', that.onSendMsgFailed);

        this.socket.on('RegError', function() {
            that.setRegStatus("Unknown error occured when register!");
        });

        this.socket.on('UserIdExist', function() {
            that.setRegStatus("The user id is already exist!");
        });

        this.socket.on('registerSuccessful', function() {
            that.setRegStatus("Registered successfully!");
        });

        document.getElementById('loginBtn').addEventListener('click', this.login);

        document.getElementById('inviteBtn').addEventListener('click', function() {
            that.initPC();
            that.invite();
        }, false);

        document.getElementById('registerBtn').addEventListener('click', this.register);

        document.getElementById('sendBtn').addEventListener('click', this.sendMsg);
    },

    setStatus: function(status) {
        var loginStatus = document.getElementById('loginStatus');
        loginStatus.style.display = 'block';
        loginStatus.innerHTML = status;
        // document.getElementById('status').textContent = status;
    },

    setRegStatus: function(status) {
        var loginStatus = document.getElementById('registerStatus');
        loginStatus.style.display = 'block';
        loginStatus.innerHTML = status;
    },


    toLogin: function() {
        document.getElementById("registerWrapper").style.display = "none";
        document.getElementById("loginWrapper").style.display = "block";
    },

    toRegister: function() {
        document.getElementById("loginWrapper").style.display = "none";
        document.getElementById("registerWrapper").style.display = "block";
    },

    login: function() {
        var that = huoranChat;
        var id = document.getElementById('idInput').value;
        var password = document.getElementById('pwdInput').value;
        if (id.trim().length == 0) {
            document.getElementById('idInput').focus();
        } else if (password.length == 0) {
            document.getElementById('pwdInput').focus();
        } else {
            that.socket.emit('login', {
                userId: id,
                password: password
            });
        };
    },

    register: function() {
        var that = huoranChat;
        var id = document.getElementById('regIdInput').value;
        var password = document.getElementById('regPwdInput').value;
        var rePassword = document.getElementById('regPwdReInput').value;

        if (id.trim().length == 0) {
            document.getElementById('regIdInput').focus();
        } else if (password.length < 6) {
            document.getElementById('regPwdInput').focus();
        } else if (rePassword.length < 6) {
            document.getElementById('regPwdReInput').focus();
        } else if (password != rePassword) {
            that.setRegStatus("The passwords are not match!");
        } else {
            that.socket.emit('register', {
                userid: id,
                password: password
            });
        }
    },

    onClickItem: function() {
        var that = huoranChat;
        var id = this.userId;
        document.getElementById("inputAreaWrapper").style.display = 'block';
        document.getElementById('messageInput').onkeydown = that.onKeyDown;
        document.getElementById("chatTitle").innerHTML = id;
        that.targetId = id;
        that.clearMsg();
        var messages = that.messageRecords[id];
        if (messages != undefined) {
            for (var i = 0; i < messages.length; i++)
                that.showMessage(messages[i]);
        }
        var bubble = this.bubble;
        console.log(bubble);
        if (bubble != undefined) {
            this.removeChild(bubble);
            this.bubble = undefined;
        }
        console.log("click item " + id);
    },

    clearMsg: function() {
        document.getElementById("messageArea").innerHTML = '';
    },

    sendMsg: function() {
        var that = huoranChat;
        var messageInput = document.getElementById('messageInput');
        var msg = messageInput.value;
        var date = new Date().toTimeString().substr(0, 8);
        if (msg.trim().length == 0) {
            messageInput.focus();
            console.log('Empty Message');
        } else {
            messageInput.value = "";
            if (that.targetId != null) {
                var info = {
                    from: that.selfId,
                    to: that.targetId,
                    msg: msg,
                    date: date
                };
                var messages = that.messageRecords[that.targetId];
                if (messages == undefined) {
                    messages = [];
                    that.messageRecords[that.targetId] = messages;
                }
                messages.push(info);
                that.showMessage(info);
                that.socket.emit('sendMsg', info);
            }
        }
    },

    onKeyDown: function(event) {
        var that = huoranChat;
        var keyNum = 0;
        if (window.event)
            keyNum = window.event.keyCode;
        else
            keyNum = event.which;
        if (keyNum == 13) {
            if (event.ctrlKey) {
                var messageInput = document.getElementById('messageInput');
                messageInput.value = messageInput.value + '\n';
            } else {
                if (window.event) {
                    window.event.returnValue = false;
                } else {
                    event.preventDefault();
                }
                that.sendMsg();
            }
        }

    },

    onMessage: function(info) {
        var that = huoranChat;
        var from = info.from;
        var msg = info.msg;
        var messages = that.messageRecords[from];
        if (messages == undefined) {
            messages = [];
            that.messageRecords[from] = messages;
        }
        messages.push(info);
        if (that.targetId == from)
            that.showMessage(info);
        else {
            console.log(that.userItems);
            var userItem = that.userItems[from];
            if (userItem != undefined) {
                var bubble = userItem.bubble;
                if (bubble == undefined) {
                    bubble = document.createElement('div');
                    bubble.className = 'userItem_bubble';
                    bubble.count = 0;
                    userItem.appendChild(bubble);
                    userItem.bubble = bubble;
                }
                bubble.count++;
                bubble.innerHTML = bubble.count;

            } else {
                console.log("Error: can not find the user item for user " + from);
            }
        }
        console.log("Received msg [" + msg + "] from user " + from);
    },

    showMessage: function(info) {
        var that = huoranChat;
        var from = info.from;
        var msg = info.msg.replace(new RegExp('\n', "g"), "<br>");
        var date = info.date;
        var messageArea = document.getElementById("messageArea");
        newMessageContainer = document.createElement('div');
        if (from == that.selfId)
            from = 'Me';
        newMessageContainer.className = from == "Me" ? "sentMsg" : "recievedMsg";

        var messageInfo = document.createElement('span');
        messageInfo.innerHTML = from + "  " + date + '<br>';
        messageInfo.className = "messageInfo";
        newMessageContainer.appendChild(messageInfo);

        var newMessage = document.createElement('span');
        newMessage.innerHTML = msg;
        newMessage.className = "message";
        newMessageContainer.appendChild(newMessage);

        messageArea.appendChild(newMessageContainer);
    },

    onSendMsgFailed: function(errorMsg) {
        console.log("Send msg filed:" + errorMsg);
    },

    initUI: function() {
        //convert ui widget to vars
    },

    initPC: function() {
        if (this.pc == null) {
            var that = this;
            var iceServer = {
                "iceServers": [{
                    "url": "stun:stun.l.google.com:19302"
                }]
            };
            var PeerConnection = (window.PeerConnection ||
                window.webkitPeerConnection00 ||
                window.webkitRTCPeerConnection ||
                window.mozRTCPeerConnection);
            this.pc = new PeerConnection(null);
            this.pc.onopen = function() {
                console.log("pc is open");
            };

            this.pc.onaddstream = function(event) {
                document.getElementById('remoteStreamView').src = URL.createObjectURL(event.stream);
                console.log('recieved stream from remote:');
                console.log(event.stream.getVideoTracks.length);
            };
        }
    },

    onConnect: function(users) {

    },

    onLoginSuccess: function(id) {
        that = huoranChat;
        that.selfId = id;
        document.getElementById('loginWindow').style.display = 'none';
        document.getElementById('mainUIWrapper').style.display = 'block';
        document.getElementById('userIdWrapper').innerHTML = id;
        var userIcon = document.createElement('img');
        userIcon.className = "userProfile_icon";
        userIcon.src = "resources/icons/default_icon.png";
        document.getElementById('userProfileIconWrapper').appendChild(userIcon);
        document.title = 'Huoran Chat - ' + id;
    },

    onDisconnect: function(id) {
        document.getElementById('loginWindow').style.display = 'block';
        document.getElementById('mainUIWrapper').style.display = 'none';
        document.getElementById('loginStatus').style.display = 'none';
        document.getElementById('users').innerHTML = ''; //TODO
    },

    invite: function() {
        var pc = this.pc;
        var socket = this.socket;
        var that = this;
        var id = document.getElementById('inviteIdInput').value;
        if (id.trim().length != 0) {

            this.setStatus("Inviting " + id);

            this.getUserMedia.call(navigator, {
                "audio": true,
                "video": true
            }, function(localStream) {
                document.getElementById('localStreamView').src = URL.createObjectURL(localStream);
                console.log(pc);
                that.localStream = localStream;
                pc.addStream(that.localStream);
                pc.onicecandidate = function(event) {
                    that.socket.emit('onicecandidate', id, event.candidate);
                };
                var onDesc = function(desc) {
                    console.log(desc);
                    pc.setLocalDescription(desc);
                    socket.emit('invite', id, desc);
                };

                pc.createOffer(onDesc, function(err) {
                    console.log(err);
                });
            }, function(error) {
                //TODO
            });
        } else {
            document.getElementById('idInput').focus();
        };
    },

    onInvite: function(id, offer) {

        var pc = this.pc;
        var socket = this.socket;
        var that = this;
        this.setStatus("Invited by " + id);

        pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('recieved offer：' + offer);

        this.getUserMedia.call(navigator, {
                "audio": true,
                "video": true
            }, function(localStream) {
                localStreamView.src = URL.createObjectURL(localStream);
                that.localStream = localStream;
                pc.addStream(that.localStream);
                pc.onicecandidate = function(event) {
                    that.socket.emit('onicecandidate', id, event.candidate);
                };
                var onDesc = function(desc) {
                    pc.setLocalDescription(desc);
                    socket.emit('answer', id, desc);
                    console.log("sent answer to " + id);
                };
                pc.createAnswer(onDesc, function(err) {
                    console.log(err);
                });
            },
            function(error) {});
    },


    onAnswer: function(id, answer) {
        this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("recieved anser: " + answer);
    },

    addUser: function(id) {
        var that = this;
        if (id == this.selfId)
            return;
        console.log(id + " is added;");
        this.users.push(id);

        var newUserListItem = document.createElement("div");
        var newUserIdWrapper = document.createElement('div');
        newUserIdWrapper.className = 'userItem_idWrapper';
        var newUserId = document.createTextNode(id);
        var newUserIcon = document.createElement("img");
        newUserIcon.src = "resources/icons/default_icon.png";
        newUserListItem.appendChild(newUserIcon);
        newUserIdWrapper.appendChild(newUserId);
        newUserListItem.appendChild(newUserIdWrapper);
        newUserListItem.className = 'userListItem';
        newUserListItem.userId = id;

        newUserIcon.className = 'userListItem_icon';

        newUserListItem.addEventListener('click', this.onClickItem);
        this.userItems[id] = newUserListItem;
        document.getElementById('userList').appendChild(newUserListItem);
    },

    removeUser: function(id) {
        console.log(id + " is removed;");
        var index = this.users.indexOf(id);
        this.users.splice(index, 1);
        var userListItemToRemove = this.userItems[id];
        this.userItems[id] = undefined;
        document.getElementById('userList').removeChild(userListItemToRemove);
    }
};
