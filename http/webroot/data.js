console.log("data.js");

(function() {
    Index = 0;

    var SimpleListModel = function(items) {
        this.items = ko.observableArray(items);
        this.itemToAdd = ko.observable("");
        this.addItem = function() {
            if (this.itemToAdd() != "") {
                this.items.push(this.itemToAdd()); // Adds the item. Writing to the "items" observableArray causes any associated UI to update.
                this.itemToAdd(""); // Clears the text box, because it's bound to the "itemToAdd" observable
            }
        }.bind(this); // Ensure that "this" is always this view model
    };
    var vm = new SimpleListModel(["begin"]);

    function updateData() {
        var url = "http://localhost:80/GetMessage?index=" + Index + "&callback=?";
        $.getJSON(url, function(result) {
            // alert("result: " + result);
            Index += result.length;
            $.each(result, function(i, field) {
                vm.items.push(field);
            });
            window.scrollTo(0, document.body.scrollHeight);
            setTimeout(updateData, 1000);
        }).error(function(error) {
            console.log(error);
            setTimeout(updateData, 1000);
        });
    }
    ko.applyBindings(vm);
    updateData();
})();