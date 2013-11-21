;(function(scope, undefined){

	chrome.runtime.onInstalled.addListener(init);

	var settings = scope.AppSettings = {
		'get': getSettings,
		'set': setSettings
	};

	var settingsToSync = ['socialShares', 'replacements', 'computers', 'link'];

	function init() {
		// cleanup sync settings
		chrome.storage.sync.get(function(sync) {
			var error = chrome.runtime ?
						chrome.runtime.lastError : chrome.extension.lastError;
			if (error) {
				console.error('Error occurred checking sync settings: %s', error);
				return;
			}

			var toRemove = [];
			for (var x in sync) {
				if (settingsToSync.indexOf(x) === -1) {
					toRemove.push(x);
				}
			}

			if (toRemove.length > 0) {
				console.debug('cleaning up sync settings, removing props: ', toRemove);
				chrome.storage.sync.remove(toRemove, function() {
					var error = chrome.runtime ?
								chrome.runtime.lastError : chrome.extension.lastError;
					if (error) {
						console.error('Error occurred removing sync settings: %s', error);
					}
				});
			}
		});

		chrome.storage.local.get(function(local) {
			var error = chrome.runtime ?
						chrome.runtime.lastError : chrome.extension.lastError;
			if (error) {
				console.error('Error occurred checking local settings: %s', error);
				return;
			}

			var toRemove = [];
			if (local.from !== undefined) {
				toRemove.push('from');
			}
			if (local.to !== undefined) {
				toRemove.push('to');
			}

			if (toRemove.length > 0) {
				console.debug('cleaning up local settings, removing props: ', toRemove);
				chrome.storage.local.remove(toRemove, function() {
					var error = chrome.runtime ?
								chrome.runtime.lastError : chrome.extension.lastError;
					if (error) {
						console.error('Error occurred removing local settings: %s', error);
					}
				});
			}
		});
	}

	function extend (target, source) {
		target = target || {};
		for (var prop in source) {
			if (source[prop] !== null && typeof source[prop] === 'object') {
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

			for (var x in sync) {
				// only pass along the settings to sync ...
				if (settingsToSync.indexOf(x) === -1) {
					delete sync[x];
				}
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