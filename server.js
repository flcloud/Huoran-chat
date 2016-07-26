var url = require("url");
var express = require('express');
var app = express();

var url = 'mongodb://localhost:27017/huoran-chat';
var Database = require('./database');
var db = new Database(url);

var https = require('https');
var fs = require('fs');
var privateKey = fs.readFileSync('ca/server.key');
var certificate = fs.readFileSync('ca/server.crt');
var server = https.createServer({
    key: privateKey,
    cert: certificate,
    passphrase: 'm93x02l15'
}, app);

var socketIO = require('socket.io');
var io = new socketIO();
io.attach(server);

var users = [];
var savedConnections = {};

io.on("connection", function(socket) {
    console.log("connection");

    socket.emit('onlineUsers', users);

    socket.on('login', function(info) {
        //If the user is already online, login failed
        // TODO: kick the old user
        var id = info.userId;
        var password = info.password;
        if (users.indexOf(id) > -1) {
            socket.emit("loginFailed");
            return;
        }
        db.findUser({
            'userid': id,
            'password': password
        }, function(docs) {
            if (docs.length == 0) {
                console.log(id + 'login failed!');
                socket.emit("loginFailed");
                return false;
            } else {
                console.log(id + 'login Successful!');
                users.push(id);
                savedConnections[id] = socket;
                socket.userId = id;
                socket.emit("loginSuccess", id);
                io.sockets.emit("userLogin", id);
                console.log(id + " joins the room.");
                return true;
            }
        });
    });

    socket.on('disconnect', function() {
        if (socket.userId != undefined) {
            users.splice(users.indexOf(socket.userId), 1);
            delete savedConnections[socket.userId];
            io.sockets.emit("userLogout", socket.userId);
        }
    });

    socket.on('invite', function(id, offer) {
        if (socket.userId != undefined) {
            if (savedConnections[id] != undefined) {
                savedConnections[id].emit('onInvite', socket.userId, offer);
                console.log(socket.userId + ' invites ' + id);
            }
        }
    });

    socket.on('answer', function(id, answer) {
        if (socket.userId != undefined) {
            if (savedConnections[id] != undefined) {
                savedConnections[id].emit('onAnswer', socket.userId, answer);
                console.log(socket.userId + ' answers ' + id);
            }
        }
    });

    socket.on('onicecandidate', function(id, candidate) {
        if (socket.userId != undefined) {
            if (savedConnections[id] != undefined) {
                savedConnections[id].emit('onicecandidate', socket.userId, candidate);
                console.log(socket.userId + ' sends iceCandidates to ' + id);
            }
        }
    });

    socket.on('sendMsg', function(info) {
        var from = info.from;
        var to = info.to;
        console.log(info);
        if (socket.userId != from) {
            socket.emit("sendMsgFailed", "Authentication failed.");
            console.log(socket.userId + ' send msg [' + info.msg + '] failed, Authentication failed');
            return;
        }
        if (savedConnections[to] != undefined) {
            savedConnections[to].emit('onMessage', info);
            console.log(socket.userId + ' sends [' + info.msg + '] to ' + to);
        } else {
            socket.emit("sendMsgFailed", "User does not exist.");
            console.log(socket.userId + ' send msg [' + info.msg + '] failed, user does not exist.');
        }
    });

});
app.use("/", express.static(__dirname + '/www'));

var port = 808;
server.listen(port);

console.log("Server started at port " + port + '.');



var register = function(userId, password) {
    if (!isVaildId) {
        console.log('The id is not vaild.');
    }
    if (!isVaildPassword)
        console.log('The password is not valid.');
    db.registerUser(user, function(r) {});
};

var isVaildId = function(id) {
    //TODO
    return true;
};

var isVaildPassword = function(password) {
    //TODO
    return true;
};
