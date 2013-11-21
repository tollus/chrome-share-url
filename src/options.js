;(function($, undefined){
	'use strict';

	var $computerName;
	var $socials;
	var $replaces;
	var $historyList, $historyEnable;

	var settings;

	$(init);

	function i18n_msg(messageName, substitutions) {
		if (substitutions === undefined)
			return chrome.i18n.getMessage(messageName);

		return chrome.i18n.getMessage(messageName, substitutions);
	}

	function init(){
		$computerName = $('#computer-name');
		$socials = $('#use-fbook, #use-gplus, #use-twit');
		$replaces = $('#replace-goog');
		$historyEnable = $('#enable-history');
		$historyList = $('#link-history');
		$('#save-button').button().on('click', saveChanges);

		// only modify the settings we're actually changing...
		AppSettings.get(['computerName', 'computerId', 'socialShares', 'computers', 'replacements', 'history'], function(items){
			settings = $.extend({}, items);

			if (!settings.computerName) {
				settings.computerName = 'Unnamed ' + settings.computerId;
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

			var history = settings.history || {};

			if (history.enabled === true) {
				$historyEnable.attr('checked', 'checked');

				if (history.links && history.links.length > 0) {
					$historyList.html('');
					$.each(history.links, function(_, value) {
						var element = $('<li><a></a></li>');
						var fromComputer = settings.computers[value.from];
						fromComputer = fromComputer.name || fromComputer;

						element.find('a')
							.attr('href', value.href)
							.attr('title', i18n_msg('options_title_history_link', [fromComputer]))
							.text(prettyUrlTrunc(value.href, 60));
						element.appendTo($historyList);
					});
				}
			}

			// don't want to keep these values in the local settings
			delete settings.computerId;
			delete settings.computers;
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

		if ($historyEnable.is(':checked')) {
			settings.history = settings.history || {};
			settings.history.enabled = true;
		}

		AppSettings.set(settings);
	}

	function prettyUrlTrunc(url, length) {
		if (url.length <= length) return url;

		var ellipsis = i18n_msg('options_history_ellipsis_character');

		// '...' at the end
		length -= ellipsis.length;

		// remove the scheme
		var schemePos = url.indexOf(':/');
		if (schemePos === -1) {
			// must be a strange link, let's just use normal truncate
			return url.substring(0, length) + ellipsis;
		}
		url = url.substring(schemePos + 3);
		if (url.length <= length) return url;

		// first cut off the ?
		var hasQueryInfo = false;
		var qsPos = url.indexOf('?');
		if (qsPos > length) {
			url = url.substring(0, qsPos + 1);
			hasQueryInfo = true;
			// additional '...' at the end
			length -= ellipsis.length;
		} else if (qsPos > -1) {
			// qsPos is less than length, so just normal truncate
			return url.substring(0, length) + ellipsis;
		}

		// this means the url is long excluding the querystring values
		var domainLength = url.indexOf('/');
		if (domainLength === -1 || (domainLength + 1) > length) {
			// long domain or no / can't do anything better with this
			return url.substring(0, length) + ellipsis;
		}

		// found the domain, now let's see how much "room" we have to work with
		var afterLength = length - (domainLength + 1);
		return url.substring(0, domainLength + 1)
			+ ellipsis
			+ url.substring(url.length - afterLength)
			+ (hasQueryInfo ? ellipsis : '');
	}

}(jQuery));
