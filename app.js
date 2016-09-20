var args = process.argv.slice(2);
console.log('args: ' + process.argv);
var ip = args[0] || '127.0.0.1';
var port = args[1] || '36379';
console.log('redis: ' + ip + ':' + port);
var http = require('./http/HttpServer');
http.start(ip, port);