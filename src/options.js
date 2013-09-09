;(function($, undefined){
  "use strict";

  var $computerName;

	var settings;

	$(init);

	function init(){
		$computerName = $('#computer-name');
		$('#save-button').button().on('click', saveChanges);

		chrome.storage.local.get(null, function(items){
			var changed = false;

			settings = $.extend({}, items);

			if (!settings.computerName) {
				settings.computerName = "Unnamed " + settings.computerId;
				changed = true;
			}

			if (changed) {
				saveSettings();
			}

			$computerName.val(settings.computerName);
		});
	}

	function saveChanges(e) {
		settings.computerName = $computerName.val();

		saveSettings();
	}

	function saveSettings() {
		chrome.storage.local.set(settings, function() {
		    var error = chrome.runtime ?
		                chrome.runtime.lastError : chrome.extension.lastError;
			if (error) {
				console.error('Error occurred changing settings: %s', error);
				alert('Error occurred changing settings: ' + error);
			}
		});
	}

}(jQuery));