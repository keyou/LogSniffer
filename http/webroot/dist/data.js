console.log("data.js");

(function(expose) {
    var Index = 0;
    var remoteTimer, localTimer;

    var SimpleListModel = function(items) {
        this.items = ko.observableArray(items);
        this.key = ko.observable("local");
        this.updateKey = ko.pureComputed({
            read: function() {
                return this.key(); },
            write: function(value) { this.key(value); },
            owner: this
        });
    };
    var vm = new SimpleListModel(["start listen."]);
    vm.key.subscribe(function(newKey) {
        Index = 0;
        "Queue-b9f7a";
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

    function localMain() {
        var url = "http://localhost:80/GetMessage?index=" + Index + "&callback=?";
        $.getJSON(url, function(result) {
            // alert("result: " + result);
            Index += result.length;
            $.each(result, function(i, field) {
                vm.items.push(field);
            });
            // window.scrollTo(0, document.body.scrollHeight);
            localTimer = setTimeout(localMain, 1000);
        }).error(function(error) {
            console.log(error);
            localTimer = setTimeout(localMain, 1000);
        });
    }

    function remoteMain() {
        // var url = "http://localhost:8888/search?key=Queue-b9f7a&index=" + Index + "&count=" + 50 + "&callback=?";
        var url = "http://localhost:8888/search?key=" + vm.key() + "&index=" + Index + "&count=" + 100 + "&callback=?";
        $.getJSON(url, function(result) {
            // alert("result: " + result);
            Index += result.length;
            $.each(result, function(i, field) {
                vm.items.push(field);
            });
            // window.scrollTo(0, document.body.scrollHeight);
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