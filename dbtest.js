var url = 'mongodb://localhost:27017/huoran-chat';
var Database = require('./database');
var db = new Database(url);

db.verifyConnection();

var user = {};
user.userid = "zige";
user.password = "123456";

// db.insertUser(user, function(r) {
//     console.log("Successfully inserted.")
// });

// db.deleteUser({
//     'userid': 'naozi'
// });

// db.findUser({
//     'userid': 'zige'
// }, function(docs) {
//     console.log('\nQuery result:\n');
//     console.log(docs);
// });

var login = function(userId, password) {
    db.findUser({
        'userid': userId,
        'password': password
    }, function(docs) {
        if (docs.length == 0) {
            console.log('login failed!');
            return false;
        } else {
            console.log('login Successful!');
            return true;
        }
    });
};

var register = function(user) {
    if (!isVaildId(user.userid)) {
        console.log('The id is not vaild.');
    }
    if (!isVaildPassword(user.password))
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



///=============
//db.deleteUser({});
register({ userid: 'naozi', password: '123456' });




login('zige', '123456');
login('zige', '1d3456');
login('naozi', '123456');


db.listUser(function(docs) {
    console.log('\nUser list:\n');
    console.log(docs);
});
