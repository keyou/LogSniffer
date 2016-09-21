(function(expose) {

    var url = require('url');
    // redis 链接
    var redis = require('redis');

    Date.prototype.Format = function(fmt) { //author: meizz 
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
    }

    var sessionIdRegex = /\[([^[]*?)\]/im;
    var idRegex = /\[Id\]\s*(.*?)$/im;

    var Service = function() {

        var cmds = {
            'ls': function(socket, args) {
                if (args.length > 1) {
                    var startIndex = parseInt(args[2] || -100);
                    client.lrange('user:' + args[1] + ':logs', startIndex, args[3] || startIndex + 99, function(error, res) {
                        if (error) {
                            console.log(error);
                            socket.emit('control', error);
                        } else if (res) {
                            responseIO(socket, args.join(' '), res);
                        }
                    });
                } else {
                    client.lrange('latest-users', 0, 10, function(error, res) {
                        if (error) {
                            console.log(error);
                            socket.emit('control', error);
                        } else if (res) {
                            var ids = [];
                            for (var s in res) {
                                (function(s) {
                                    client.get('user:' + res[s] + ':id', function(error, r) {
                                        ids.push([res[s], r]);
                                        if (s == res.length - 1) {
                                            responseIO(socket, args.join(' '), ids);
                                        }
                                    });
                                })(s);
                            }
                        }
                    });
                }
            },
            'track': function(socket, args) {
                if (args.length < 2) return;
                // for (var r in socket.rooms) {
                //     socket.leave(r);
                // }
                // socket.join(socket.id);
                socket.join(args[1]);
                responseIO(socket, args.join(' '), 'OK');
            },
            'untrack': function(socket, args) {
                for (var r in socket.rooms) {
                    socket.leave(r);
                }
                socket.join(socket.id);
                responseIO(socket, args.join(' '), 'OK');
            }
        };

        var responseIO = function(socket, cmd, result) {
            socket.emit('data', { 'cmd': cmd, 'result': result });
        };

        var client;

        this.init = function(httpServer, redisHost, redisPort) {
            client = redis.createClient(redisPort, redisHost);
            // redis 链接错误
            client.on("error", function(error) {
                console.error("[service] radis error: " + error);
            });

            var io = require('socket.io')(httpServer);
            io.on('connection', function(socket) {
                console.log('connect: ', socket.id);
                socket.on('disconnect', function(socket) {
                    console.log('disconnect: ', socket.id);
                });
                socket.on('data', function(cmd) {
                    console.log('data: ', socket.id + ": " + cmd);
                    var args = cmd.trim().split(/\s+/);
                    var func = cmds[args[0]];
                    if (func) {
                        func(socket, args);
                    } else {
                        responseIO(socket, cmd, '(null)');
                    }
                });
                socket.emit('control', 'Hello, This is LogSniffer!');
                socket.emit('control', '使用方式：');
                socket.emit('control', 'ls - 列出当前活动的 10 个 sessionId。');
                socket.emit('control', 'ls <sessionId> [<startIndex>] [<endIndex>] - ' + '查看指定 sessionId 的日志。 ');
                socket.emit('control', 'track <sessionId> - 实时跟踪指定 sessionId 的日志。');
                socket.emit('control', 'untrack - 取消实时跟踪。');
                socket.emit('control', 'cls - 清空屏幕。');
            });

            var sub = client.duplicate();
            sub.on('pmessage', function(pattern, channel, message) {
                console.log(channel + ": " + message);
                var match = sessionIdRegex.exec(message);
                var result = message;
                if (match != null) {
                    result = match[1].replace(/\s/, "-");
                }
                if (channel == 'new') {
                    io.emit(channel, message);
                } else if (channel == 'id') {
                    io.emit(channel, message.split(';'));
                } else {
                    io.to(result).emit(channel, message);
                }
            });

            sub.psubscribe('*');
            // sub.subscribe('log');
            // sub.subscribe('new');
        };

        this.addData = function(request, response) {
            var info = "";
            request.addListener('data', function(chunk) {
                    info += chunk;
                })
                .addListener('end', function() {
                    var match = sessionIdRegex.exec(info);
                    var result = info;
                    if (match != null) {
                        result = match[1].replace(/\s/, "-");
                    }

                    client.rpush('list', info, function(error, res) {
                        if (error) {
                            console.log(error);
                        }
                    });
                    client.rpush('user:' + result + ":logs", info);
                    var dateStr = new Date().Format("yyyy-MM-dd hh:mm:ss");
                    client.set('user:' + result + ":lasttime", dateStr, function(error, res) {
                        if (error) {
                            console.log(error);
                        }
                    });
                    client.lrem('latest-users', 0, result, function(error, res) {
                        if (error) {
                            console.log(error);
                        } else {
                            if (res == 0) {
                                client.publish('new', result);
                            }
                        }
                    });
                    client.lpush('latest-users', result);
                    client.publish('log', info);
                    match = idRegex.exec(info);
                    if (match != null) {
                        client.set('user:' + result + ':id', match[1]);
                        client.publish('id', result + ';' + match[1]);
                    }

                    response.writeHead(200, { "content-type": "application/json" });
                    response.end();
                }.bind(this));
        };

        this.listData = function(request, response) {
            var urlObj = url.parse(request.url, true).query;
            var index = urlObj.index;
            var count = urlObj.count;
            var callback = urlObj.callback;
            client.lrange('list', index, parseInt(index) + parseInt(count), function(error, res) {
                if (error) {
                    console.log(error);
                }

                responseJSONP(request, response, res);
            });
        };

        this.searchData = function(request, response) {
            var urlObj = url.parse(request.url, true).query;
            var key = 'user:' + urlObj.key + ":logs";
            var index = urlObj.index;
            var count = urlObj.count;

            client.lrange(key, index, parseInt(index) + parseInt(count), function(error, res) {
                if (error) {
                    console.log(error);
                }

                responseJSONP(request, response, res);
            });
        }

        this.getLength = function(request, response) {
            var urlObj = url.parse(request.url, true).query;
            var key = 'user:' + urlObj.key;

            client.llen(key, function(error, res) {
                if (error) {
                    console.log(error);
                }
                var len = { length: parseInt(res) };
                responseJSONP(request, response, len);
            });
        }

        this.listUsers = function(request, response) {
            var urlObj = url.parse(request.url, true).query;
            client.keys('user:*', function(error, res) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(res);
                }

                responseJSONP(request, response, res);
            });
        }

        var responseJSONP = function(request, response, data) {
            var urlObj = url.parse(request.url, true).query;
            var callback = urlObj.callback;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(callback + "(" + JSON.stringify(data) + ")");
        }

    };

    module.exports = new Service();

})(module.exports);