//http协议模块
var http = require('http');
//url解析模块
var url = require('url');
//文件系统模块
var fs = require("fs");
//路径解析模块
var path = require("path");

//创建一个服务
var httpServer = http.createServer(this.processRequest.bind(this));

//在指定的端口监听服务
httpServer.listen(port,function(){
    console.log("[HttpServer][Start]","runing at http://"+ip+":"+port+"/");
    console.timeEnd("[HttpServer][Start]");
});

