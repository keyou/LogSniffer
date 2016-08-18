(function(expose) {

    var url = require('url');
    // redis 链接
    var redis = require('redis');

    var client = redis.createClient('36379', '127.0.0.1');
    // redis 链接错误
    client.on("error", function(error) {
        console.error("[add] radis error: " + error);
    });

    var rgx = /\[([^[]*?)\]/im;

    var Service = function() {

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
                        } else {
                            client.rpush('user:' + result, info);
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
            var key = 'user:' + urlObj.key;
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