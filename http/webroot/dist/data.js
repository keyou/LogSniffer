console.log("data.js");

(function(expose) {
    var Index = 0;
    var remoteTimer, localTimer;
    var host = "http://localhost:80";
    var isStoped = false;

    var SimpleListModel = function(items) {
        this.items = ko.observableArray(items);
        this.key = ko.observable("local");
        this.startIndex = ko.observable("");
        this.endIndex = ko.observable("");
        this.count = ko.observable("");
        this.updateKey = ko.pureComputed({
            read: function() {
                return this.key();
            },
            write: function(value) { this.key(value); },
            owner: this
        });
        this.clear = function() {
            var vm = this;
            var url = host + "/Clear?callback=?";
            $.getJSON(url, function(result) {
                console.log("clear success.");
                vm.items.removeAll();
                Index = 0;
            }).error(function(error) {
                console.log(error);
            });
        }.bind(this);
    };
    var vm = new SimpleListModel([]);
    vm.key.subscribe(function(newKey) {
        Index = 0;
        vm.items.removeAll();
        isStoped = false;
        if (newKey == "local") {
            localMain();
            if (remoteTimer != undefined) {
                clearTimeout(remoteTimer);
            }
        } else {
            if (localTimer != undefined) {
                clearTimeout(localTimer);
            }

            $.getJSON("/length?key=" + vm.key() + "&callback=?", function(result) {
                Index = result.length - 1000;
                if (Index < 0) Index = 0;
                vm.count(result.length);
                remoteMain();
            }).error(function(error) {
                console.log(error);
            });
        }
    });

    vm.startIndex.subscribe(function(newKey) {
        if (vm.key() == "local") {
            return;
        }
        Index = parseInt(newKey);
        vm.items.removeAll();
        if (remoteTimer != undefined) {
            console.log("clear remoteTimer");
            clearTimeout(remoteTimer);
        }
        if (localTimer != undefined) {
            console.log("clear localTimer");
            clearTimeout(localTimer);
        }
        isStoped = true;

        var url = "/search?key=" + vm.key() + "&index=" + newKey + "&count=" + 100 + "&callback=?";
        $.getJSON(url, function(result) {
            update(result);
        }).error(function(error) {
            console.log(error);
        });

    });

    function update(result) {
        var startIndex = Index;
        var canScroll = false;
        if (document.body.scrollTop + window.innerHeight + 10 >= document.body.clientHeight) {
            canScroll = true;
        }
        $.each(result, function(i, field) {
            vm.items.push({ index: startIndex + i, value: field });
        });
        if (canScroll) {
            window.scrollTo(0, document.body.scrollHeight);
        }
        Index += result.length;
    }

    function localMain() {
        var url = host + "/GetMessage?index=" + Index + "&callback=?";
        $.getJSON(url, function(result) {
            update(result);
            localTimer = startLoop(localMain, 1000);
        }).error(function(error) {
            console.log(error);
            localTimer = startLoop(localMain, 1000);
        });
    }

    function remoteMain() {
        var url = "/search?key=" + vm.key() + "&index=" + Index + "&count=" + 250 + "&callback=?";
        $.getJSON(url, function(result) {
            update(result);
            remoteTimer = startLoop(remoteMain, 1000);
        }).error(function(error) {
            console.log(error);
            remoteTimer = startLoop(remoteMain, 1000);
        });
    }

    function startLoop(action, time) {
        if (isStoped) {
            console.log("cannot loop");
            return null;
        }
        return setTimeout(action, time);
    }

    ko.applyBindings(vm);
    expose.main = function(type) {
        localMain();
    };
})((function() {
    if (typeof exports === "undefined") {
        window.api = {};
        return window.api;
    } else {
        return exports;
    }
})());