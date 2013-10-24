;(function($, undefined){
	"use strict";

	var $computerName;
	var $socials;
	var $replaces;

	var settings;

	$(init);

	function init(){
		$computerName = $('#computer-name');
		$socials = $('#use-fbook, #use-gplus, #use-twit');
		$replaces = $('#replace-goog');
		$('#save-button').button().on('click', saveChanges);

		// only modify the settings we're actually changing...
		AppSettings.get(['computerName', 'socialShares', 'replacements'], function(items){
			settings = $.extend({}, items);

			if (!settings.computerName) {
				settings.computerName = "Unnamed " + settings.computerId;
				AppSettings.set({computerName: settings.computerName});
			}

			$computerName.val(settings.computerName);

			var shares = settings.socialShares || '';

			$socials.each(function() {
				var soc = this.id.split('-')[1];
				this.checked = (shares.indexOf(soc) > -1);
			});

			var replacements = settings.replacements || '';

			$replaces.each(function() {
				var repl = this.id.split('-')[1];
				this.checked = (replacements.indexOf(repl) > -1);
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

		var replaces = [];
		$replaces.each(function() {
			var repl = this.id.split('-')[1];
			if(this.checked) {
				replaces.push(repl);
			}
		});
		settings.replacements = replaces.join(',');

		AppSettings.set(settings);
	}

}(jQuery));
