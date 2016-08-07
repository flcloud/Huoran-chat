var Database = function(url) {
    var assert = require('assert');
    var MongoClient = require('mongodb').MongoClient;

    var url = url;

    this.setUrl = function(url) {
        this.url = url;
    }

    this.verifyConnection = function() {
        this.connectAndDo(function(db) {
            db.close();
        });
    };

    this.connectAndDo = function(callback) {
        MongoClient.connect(url, function(err, db) {
            if (err != null)
                console.log(err);
            if (callback != undefined && callback != null)
                callback(db);
        });
    };

    this.listUser = function(callback) {
        var _cb = function(db) {
            var users = db.collection('users');
            users.find({}).toArray(function(err, doc) {
                if (err != null)
                    console.log(err);
                if (callback != null && callback != undefined)
                    callback(doc);
                db.close();
            });
        }
        this.connectAndDo(_cb);
    };

    this.insertUser = function(user, callback) {
        var _cb = function(db) {
            var users = db.collection('users');
            users.insertOne(user, function(err, r) {
                if (err != null)
                    console.log(err);
                if (callback != null && callback != undefined)
                    callback(r);
                db.close();
            });
        };
        this.connectAndDo(_cb);
    };

    this.registerUser = function(user, callback) {
        var _cb = function(db) {
            var users = db.collection('users');
            users.find({
                'userid': user.userid
            }).next(function(err, doc) {
                if (err != null) {
                    console.log(err);
                    if (callback != null && callback != undefined)
                        callback(-1);
                    db.close();
                    return;
                }
                if (doc == null) {
                    users.insertOne(user, function(err, r) {
                        if (err != null) {
                            console.log('User registration failed.');
                            if (callback != null && callback != undefined)
                                callback(-2);
                            //TODO : concurrency issue occurs when 2 
                            // requests come at the same time
                        } else {
                            console.log('User registered succesfully.');
                            if (callback != null && callback != undefined)
                                callback(r);
                        }
                        db.close();
                    });
                } else {
                    console.log('The user id is already exist!');
                    if (callback != null && callback != undefined)
                        callback(1);
                    db.close();
                }
            });
        };
        this.connectAndDo(_cb);
    };

    this.findUser = function(condition, callback) {
        var _cb = function(db) {
            var users = db.collection('users');
            users.find(condition).toArray(function(err, doc) {
                if (err != null)
                    console.log(err);
                if (callback != null && callback != undefined)
                    callback(doc);
                db.close();
            });
        }
        this.connectAndDo(_cb);
    }

    this.clearUserList = function(callback) {
        this.deleteUser({}, callback);
    }

    this.deleteUser = function(condition, callback) {
        var _cb = function(db) {
            var users = db.collection('users');
            users.deleteMany(condition, function(err, r) {
                if (err != null)
                    console.log(err);
                if (callback != null && callback != undefined)
                    callback(doc);
                db.close();
            });
        }
        this.connectAndDo(_cb);
    }
};

module.exports = Database;
