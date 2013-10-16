;(function($, undefined){
    "use strict";

    var $computerName;
    var $socials;

	var settings;

	$(init);

	function init(){
		$computerName = $('#computer-name');
        $socials = $('#use-fbook, #use-gplus, #use-twit');
		$('#save-button').button().on('click', saveChanges);

		chrome.storage.local.get(null, function(items){
			var changed = false;

			settings = $.extend({
                socialShares: ''
            }, items);

			if (!settings.computerName) {
				settings.computerName = "Unnamed " + settings.computerId;
				changed = true;
			}

			if (changed) {
				saveSettings();
			}

			$computerName.val(settings.computerName);
            $socials.each(function() {
                this.checked = (settings.socialShares.indexOf(this.id.split('-')[1]) > -1);
            });
		});
	}

	function saveChanges(e) {
		settings.computerName = $computerName.val();

        var socials = [];
        $socials.each(function() {
            if(this.checked) {
                socials.push(this.id.split('-')[1]);
            }
        });
        settings.socialShares = socials.join(',');

		saveSettings();
	}

	function saveSettings() {
        console.debug('saving settings: ', settings);
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