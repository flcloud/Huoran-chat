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

        document.getElementById('loginBtn').addEventListener('click', function() {
            var id = document.getElementById('idInput').value;
            var password = document.getElementById('pwdInput').value;
            if (id.trim().length == 0) {
                document.getElementById('idInput').focus();
            } else if (password.trim().length == 0) {
                document.getElementById('pwdInput').focus();
            } else {
                that.socket.emit('login', {
                    userId: id,
                    password: password
                });
            };
        }, false);

        document.getElementById('inviteBtn').addEventListener('click', function() {
            that.initPC();
            that.invite();
        }, false);

        document.getElementById('sendBtn').addEventListener('click', this.sendMsg);
    },

    setStatus: function(status) {

        // document.getElementById('status').textContent = status;
    },

    sendMsg: function() {
        var messageInput = document.getElementById('messageInput');
        var msg = messageInput.value;
        var that = huoranChat
        console.log(msg);
        if (msg.trim().length == 0) {
            messageInput.focus();
            console.log('1');
        } else {
            messageInput.value = "";
            if (that.targetId != null) {
                var info = {
                    from: that.selfId,
                    to: that.targetId,
                    msg: msg
                };
                var messages = that.messageRecords[that.targetId];
                if (messages == undefined) {
                    messages = [];
                    that.messageRecords[that.targetId] = messages;
                }
                messages.push(info);
                that.addMessage(info);
                that.socket.emit('sendMsg', info);
            }
        };
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
            that.addMessage(info);
        console.log("Received msg [" + msg + "] from user " + from);
    },

    addMessage: function(info) {
        var that = huoranChat;
        var from = info.from;
        var msg = info.msg;
        var messageArea = document.getElementById("messageArea");
        var date = new Date().toTimeString().substr(0, 8);
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
        document.getElementById('userIdWrapper').innerHTML = id;
        var userIcon = document.createElement('img');
        userIcon.className = "userProfile_icon";
        userIcon.src = "resources/icons/default_icon.png";
        document.getElementById('userProfileIconWrapper').appendChild(userIcon);
        document.title = 'Huoran Chat - ' + id;
        document.getElementById('inviteBtn').disabled = false;
    },

    onDisconnect: function(id) {
        document.getElementById('loginWindow').style.display = 'block';
        document.getElementById('users').innerHTML = ''; //TODO
        document.getElementById('inviteBtn').disabled = true;
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
        console.log(id + " is added;");
        this.users.push(id);

        var newUserListItem = document.createElement("div");
        var newUserIdWrapper = document.createElement('div');
        var newUserId = document.createTextNode(id);
        var newUserIcon = document.createElement("img");
        newUserIcon.src = "resources/icons/default_icon.png";
        newUserListItem.appendChild(newUserIcon);
        newUserIdWrapper.appendChild(newUserId);
        newUserListItem.appendChild(newUserIdWrapper);
        newUserListItem.className = 'userListItem';

        newUserIcon.className = 'userListItem_icon';

        newUserListItem.addEventListener('click', function() {
            document.getElementById("chatTitle").innerHTML = id;
            that.targetId = id;
            console.log("click item " + id);
        });
        this.userItems.push(newUserListItem);
        document.getElementById('userList').appendChild(newUserListItem);
    },

    removeUser: function(id) {
        console.log(id + " is removed;");
        var index = this.users.indexOf(id);
        this.users.splice(index, 1);
        var userListItemToRemove = this.userItems[index];
        this.userItems.splice(index, 1);
        document.getElementById('userList').removeChild(userListItemToRemove);
    }
};
