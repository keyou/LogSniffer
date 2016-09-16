(function($) {
    $.fn.extend({
        cookieList: function(cookieName) {
            var cookie = $.cookie(cookieName);

            var items = cookie ? cookie.split(/,/) : [];

            return {
                add: function(val) {
                    var index = items.indexOf(val);

                    // Note: Add only unique values.
                    if (index == -1) {
                        items.push(val);
                        $.cookie(cookieName, items.join(','), { expires: 1, path: '/' });
                    }
                },
                remove: function(val) {
                    var index = items.indexOf(val);

                    if (index != -1) {
                        items.splice(index, 1);
                        $.cookie(cookieName, items.join(','), { expires: 1, path: '/' });
                    }
                },
                indexOf: function(val) {
                    return items.indexOf(val);
                },
                clear: function() {
                    items = null;
                    $.cookie(cookieName, null, { expires: 1, path: '/' });
                },
                get: function(index) {
                    return items[index];
                },
                items: function() {
                    return items;
                },
                length: function() {
                    return items.length;
                },
                join: function(separator) {
                    return items.join(separator);
                }
            };
        }
    });
    $.fn.focusEnd = function() {
        var input = this[0];
        //input.selectionStart = this.selectionEnd = this.val().length;
        input.focus(); //sets focus to element
        var val = input.value; //store the value of the element
        input.value = ''; //clear the value of the element
        input.value = val; //set that value back.  

    }
})(jQuery);

var rgx = /(Debug|Info|Warn|Error|Fatal)/im;
var receiveRgx = /\[NetClient\]\sReceive:/;
var sendRgx = /\[NetClient\]\sSend:/;
var meetingRgx = /\[MeetingService\]/;

function getType(data) {
    var match = rgx.exec(data);
    var result = "text";
    if (match != null) {
        result = match[0];
    }
    if (receiveRgx.test(data)) {
        result += ' receive';
    } else if (sendRgx.test(data)) {
        result += ' send';
    } else if (meetingRgx.test(data)) {
        result += ' meetingservice';
    }
    return 'log ' + result.toLowerCase();
}