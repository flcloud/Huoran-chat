window.onload = function() {
    var huoranChat = new HuoranChat();
    huoranChat.init();
};

var HuoranChat = function() {
    this.socket = null;
    this.pc = null;
    this.localStream = null;
    this.getUserMedia = (navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);
};

HuoranChat.prototype = {
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

    invite: function() {
        var pc = this.pc;
        var socket = this.socket;
        var that = this;
        var id = document.getElementById('idInput').value;
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
            function(error) {
            });
    },


    onAnswer: function(id, answer) {
        this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("recieved anser: " + answer);
    },

    addUser: function(id) {
        console.log(id + " is added;");
        var oldHTML = document.getElementById('users').innerHTML;
        document.getElementById('users').innerHTML = oldHTML + "<div>" + id + "</div>"
    },

    removeUser: function(id) {
        console.log(id + " is removed;");
        var oldHTML = document.getElementById('users').innerHTML;
        document.getElementById('users').innerHTML = oldHTML.replace("<div>" + id + "</div>", '');
    },

    setStatus: function(status) {
        document.getElementById('status').textContent = status;
    },

    init: function() { 
        var that = this;
        console.log(that);

        this.socket = io.connect();

        this.socket.on('connect', function() {
            document.getElementById('idInput').focus();
        });

        this.socket.on('onlineUsers', function(users) {
            for (var index in users) {
                that.addUser(users[index]);
            }
        })

        this.socket.on('loginSuccess', function(id) {
            that.setStatus('login successful with id ' + id);
            document.title = 'Huoran Chat - ' + id;
            document.getElementById('loginBtn').disabled = true;
            document.getElementById('inviteBtn').disabled = false;
        });

        this.socket.on('userLogin', function(id) {
            that.addUser(id);
        });

        this.socket.on('userLogout', function(id) {
            that.removeUser(id);
        })

        this.socket.on('disconnect', function(id) {
            that.setStatus('Disconnected from the server!');
            document.getElementById('users').innerHTML = '';
            document.getElementById('loginBtn').disabled = false;
            document.getElementById('inviteBtn').disabled = true;
        });

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
    }
};