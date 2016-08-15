console.log("data.js");

(function(expose) {
    var Index = 0;
    var remoteTimer, localTimer;
    var host = "http://localhost:80";

    var SimpleListModel = function(items) {
        this.items = ko.observableArray(items);
        this.key = ko.observable("local");
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
        if (newKey == "local") {
            localMain();
            if (remoteTimer != undefined) {
                clearTimeout(remoteTimer);
            }
        } else {
            remoteMain();
            if (localTimer != undefined) {
                clearTimeout(localTimer);
            }
        }
    });

    function update(result) {
        Index += result.length;
        var canScroll = false;
        if (document.body.scrollTop + window.innerHeight + 10 >= document.body.clientHeight) {
            canScroll = true;
        }
        $.each(result, function(i, field) {
            vm.items.push(field);
        });
        if (canScroll) {
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    function localMain() {
        var url = host + "/GetMessage?index=" + Index + "&callback=?";
        $.getJSON(url, function(result) {
            update(result);
            localTimer = setTimeout(localMain, 1000);
        }).error(function(error) {
            console.log(error);
            localTimer = setTimeout(localMain, 1000);
        });
    }

    function remoteMain() {
        var url = "/search?key=" + vm.key() + "&index=" + Index + "&count=" + 100 + "&callback=?";
        $.getJSON(url, function(result) {
            update(result);
            remoteTimer = setTimeout(remoteMain, 1000);
        }).error(function(error) {
            console.log(error);
            remoteTimer = setTimeout(remoteMain, 1000);
        });
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