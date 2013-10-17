;(function(scope, undefined){

	var settings = scope.AppSettings = {
		'get': getSettings,
		'set': setSettings
	};

    var settingsToSync = ["socialShares", "computers", "link"];

    function extend (target, source) {
        target = target || {};
        for (var prop in source) {
            if (typeof source[prop] === 'object') {
                target[prop] = extend(target[prop], source[prop]);
            } else {
                target[prop] = source[prop];
            }
        }
        return target;
    }

	function getSettings(fields, callback) {
		if (callback === undefined) {
            callback = fields;
            fields = null;
		}

        if (typeof callback !== 'function') {
            throw 'callback must be a function';
        }

        if (typeof fields === 'string') {
            fields = [fields];
        }

        chrome.storage.sync.get(fields, function(sync){
            var error = chrome.runtime ?
                        chrome.runtime.lastError : chrome.extension.lastError;
            if (error) {
                console.error('Error occurred getting sync settings: %s', error);
            }

            chrome.storage.local.get(fields, function(local){
                var error = chrome.runtime ?
                            chrome.runtime.lastError : chrome.extension.lastError;
                if (error) {
                    console.error('Error occurred getting local settings: %s', error);
                }

                callback(extend(extend({}, local), sync));
            });
        });
	}

    function setSettings(value, callback) {
        if (typeof callback !== 'function') {
            callback = function(){};
        }

        var sync = {}, hasSync = false;
        settingsToSync.forEach(function(prop) {
            if (value[prop] !== undefined) {
                sync[prop] = value[prop];
                hasSync = true;
            }
        });

        if (hasSync) {
            chrome.storage.sync.set(sync, function() {
                var error = chrome.runtime ?
                            chrome.runtime.lastError : chrome.extension.lastError;
                if (error) {
                    console.error('Error occurred changing sync settings: %s', error);
                }
                chrome.storage.local.set(value, function() {
                    var error = chrome.runtime ?
                                chrome.runtime.lastError : chrome.extension.lastError;
                    if (error) {
                        console.error('Error occurred changing local settings: %s', error);
                    }

                    callback();
                });
            });
        } else {
            chrome.storage.local.set(value, function() {
                var error = chrome.runtime ?
                            chrome.runtime.lastError : chrome.extension.lastError;
                if (error) {
                    console.error('Error occurred changing local settings: %s', error);
                }

                callback();
            });
        }
    }

}(window));