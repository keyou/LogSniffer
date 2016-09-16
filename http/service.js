(function(expose) {

    var url = require('url');
    // redis 链接
    var redis = require('redis');

    var client = redis.createClient('36379', '127.0.0.1');
    // redis 链接错误
    client.on("error", function(error) {
        console.error("[service] radis error: " + error);
    });

    // Date.prototype.Format = function(fmt) { //author: meizz 
    //     var o = {
    //         "M+": this.getMonth() + 1, //月份 
    //         "d+": this.getDate(), //日 
    //         "h+": this.getHours(), //小时 
    //         "m+": this.getMinutes(), //分 
    //         "s+": this.getSeconds(), //秒 
    //         "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
    //         "S": this.getMilliseconds() //毫秒 
    //     };
    //     if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    //     for (var k in o)
    //         if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    //     return fmt;
    // }

    var rgx = /\[([^[]*?)\]/im;

    var Service = function() {

        this.init = function(httpServer) {
            var io = require('socket.io')(httpServer);
            io.on('connection', function(socket) {
                console.log('connect: ', socket.id);
                socket.on('disconnect', function(socket) {
                    console.log('disconnect: ', socket.id);
                });
                socket.on('data', function(msg) {
                    console.log('data: ', socket.id + ": " + msg);
                    socket.emit('data', socket.id + ": " + msg);

                });
                socket.emit('data', 'hello!');
            });
        };

        // client.keys('user:*', function(error, res) {
        //     if (error) {
        //         console.log(error);
        //     } else {
        //         console.log(res);
        //     }

        //     responseJSONP(request, response, res);
        // });

        this.addData = function(request, response) {
            var info = "";
            request.addListener('data', function(chunk) {
                    info += chunk;
                })
                .addListener('end', function() {
                    var match = rgx.exec(info);
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
                    var date = new Date();
                    var dateStr = date.Format("yyyy-MM-dd hh:mm:ss");
                    client.set('user:' + result + ":lasttime", dateStr, function(error, res) {
                        if (error) {
                            console.log(error);
                        }
                    });

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