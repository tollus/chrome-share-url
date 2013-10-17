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

		AppSettings.get(function(items){
			var changed = false;

			settings = $.extend({}, items);

			if (!settings.computerName) {
				settings.computerName = "Unnamed " + settings.computerId;
				changed = true;
			}

			if (changed) {
				AppSettings.set(settings, function() {});
			}

			$computerName.val(settings.computerName);

			var shares = settings.socialShares || '';

			$socials.each(function() {
				var soc = this.id.split('-')[1];
				this.checked = (shares.indexOf(soc) > -1);
			});
		});
	}

	function saveChanges(e) {
		settings.computerName = $computerName.val();

		var socials = [];
		$socials.each(function() {
			var soc = this.id.split('-')[1];
			if(this.checked) {
				socials.push(soc);
			}
		});
		settings.socialShares = socials.join(',');

		AppSettings.set(settings, function() {});
	}

}(jQuery));