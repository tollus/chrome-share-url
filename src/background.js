;(function(undefined){
	"use strict";

	var LinkReplacements = {
		'goog': function(url) {
			// https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&ved=...&url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D5pNlMgH2p-Y&ei=...
			if (/\.google\.[^\/]+\/url\?/i.test(url) === false) {
				// not for me
				return false;
			}

			var changed = false;
			var query = url.split('?', 2)[1];
			var parts = query.split('&');
			parts.forEach(function (part) {
				var values = part.split('=', 2);
				if (values[0] === 'url') {
					// decode uri
					url = decodeURIComponent(values[1]);
					_log('found url ', url);
					changed = true;
				}
			});

			if (changed) {
				return url;
			}

			return false;
		}
	};

	var shareUrls = {
		'gplus': 'https://plus.google.com/share?url={url}',
		'twit': 'http://www.twitter.com/share?url={url}',
		'fbook': 'http://www.facebook.com/share.php?u={url}'
	};

	// remember this computer id instead of always calling settings
	var computerId = null;

	// store id to prevent creating context menu more than once
	var contextMenuId;

	// debug logging
	//var _log = function() {};
	//var _error = function() {};
	var _log = function() {console.log.apply(console, arguments);};
	var _error = function() {console.error.apply(console, arguments);};

	if (chrome.tabs) {
		chrome.tabs.onUpdated.addListener(function(tabid, changeInfo, tab) {
			if (tab.active && changeInfo.status === "loading")
				createContextMenu();
		});
		chrome.tabs.onActivated.addListener(function() {
			createContextMenu();
		});
	}

	chrome.runtime.onInstalled.addListener(init);
	chrome.runtime.onInstalled.addListener(createContextMenu);
	chrome.runtime.onStartup.addListener(init);
	chrome.runtime.onStartup.addListener(createContextMenu);
	chrome.storage.onChanged.addListener(storageChanged);
	chrome.contextMenus.onClicked.addListener(contextMenuClicked);

	function init() {
		// remove any non-updated computers
		AppSettings.get(['computers'], function(settings){
			if (settings.computers) {
				var computers = {};
				var removed = [];
				var changes = false;
				var monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
				monthAgo = monthAgo.getTime();

				for (var comp in settings.computers) {
					if (!settings.computers[comp].name || settings.computers[comp].update < monthAgo) {
						// remove and wait for next update
						changes = true;
						removed.push(settings.computers[comp].name || settings.computers[comp]);
					} else {
						computers[comp] = settings.computers[comp];
					}
				}

				if (changes) {
					_log('Removed inactive/old computers: ' + removed.join(','));
					AppSettings.set({computers:computers});
				}
			}
		});
	}

	function i18n_msg(messageName, substitutions) {
		if (substitutions === undefined)
			return chrome.i18n.getMessage(messageName);

		return chrome.i18n.getMessage(messageName, substitutions);
	}

	// Set up context menu tree at install time.
	function createContextMenu(force) {
		if (contextMenuId && !force) return;

		AppSettings.get(['computers', 'socialShares'], function(settings){
			var otherComputers = 0;

			var addContextMenu = function(title, id, extra) {
				var opts = extra || {};
				opts.title = title;
				opts.id = id;
				opts.contexts = opts.contexts || ['link'];
				opts.targetUrlPatterns = opts.targetUrlPatterns || ['http://*/*','https://*/*'];
				return chrome.contextMenus.create(opts)
			}

			if (settings.computers) {
				for (var c in settings.computers) {
					if (c !== computerId) {
						otherComputers++;
					}
				}
			}

			var wantsSocial = (settings.socialShares || '').length > 0;
			var useSubmenu = (otherComputers > 1) || wantsSocial;

			_log("creating contextMenu");

			chrome.contextMenus.removeAll();

			if (!useSubmenu){
				contextMenuId = addContextMenu(i18n_msg('contextmenu_share_single'), 'all');
			} else {
				_log('Adding menu with children.');

				if (otherComputers > 1) {
					contextMenuId = addContextMenu(i18n_msg('contextmenu_share_multi'), 'base');

					addContextMenu(i18n_msg('contextmenu_share_all'), 'all', {'parentId': contextMenuId});

					for (var c in settings.computers) {
						if (c !== computerId) {
							var computer = settings.computers[c];
							var computerName = computer.name || computer;
							var menu = i18n_msg('contextmenu_share_computer', [computerName]);
							addContextMenu(menu, 'computer_' + c, {'parentId': contextMenuId});
						}
					}
				} else {
					contextMenuId = addContextMenu(i18n_msg('extension_name'), 'base');

					addContextMenu(i18n_msg('contextmenu_share_single'), 'all', {'parentId': contextMenuId});
				}

				addContextMenu('sep1', 'sep1', {'parentId': contextMenuId, 'type': 'separator'});

				if (wantsSocial) {
					for (var s in shareUrls) {
						if (settings.socialShares.indexOf(s) > -1) {
							var menu = i18n_msg('contextmenu_social_' + s);
							addContextMenu(menu, 'social_' + s, {'parentId': contextMenuId});
						}
					}

					addContextMenu('sep2', 'sep2', {'parentId': contextMenuId, 'type': 'separator'});
				}

				addContextMenu(i18n_msg('contextmenu_configure'), 'settings', {'parentId': contextMenuId});
			}
		});
	}

	function contextMenuClicked(info, tab) {
		// based on the menuItemId, call the click function
		if (info.menuItemId === 'settings') {
			_log('opening options tab');
			openOptionsTab();
			return;
		}

		if (info.menuItemId === 'all') {
			_log('Sending to all computers');
			return contextMenuClick(info, tab, null);
		}

		if (info.menuItemId.indexOf('_') > -1) {
			var parts = info.menuItemId.split('_');
			switch (parts[0]) {
				case 'computer':
					_log('Sending to computer %s', parts[1]);
					return contextMenuClick(info, tab, parts[1]);
				case 'social':
					_log('Sharing to social service %s', parts[1]);

					var socialUrl = shareUrls[parts[1]];
					if (!socialUrl) {
						_error('Missing link for social service %s', parts[1]);
						return;
					}

					socialUrl = socialUrl.replace(/{url}/ig, encodeURIComponent(info.linkUrl));

					chrome.tabs.create({url: socialUrl});
					return;
			}
		}
	}

	function openOptionsTab(){
		var optionsUrl = chrome.extension.getURL('options.html');

		chrome.tabs.query({url: optionsUrl}, function(tabs) {
			if (tabs.length) {
				chrome.tabs.update(tabs[0].id, {active: true});
			} else {
				chrome.tabs.create({url: optionsUrl});
			}
		});
	}

	function findComputerId(){
		if (computerId) return;

		AppSettings.get(['computerId', 'computerName'], function(settings){
			if (settings && settings.computerId) {
				computerId = settings.computerId;
				_log('Found computerid: %s', computerId);
				if (settings.computerName) {
					_log('Found computerName: %s', settings.computerName);

					forceUpdateComputer();

					return;
				} else {
					settings.computerName = i18n_msg('settings_default_computername', [ computerId ]);
				}
			} else {
				computerId = Math.round(Math.random() * Date.now() * 1000).toString(36);
				settings = {
					'computerId': computerId,
					'computerName': i18n_msg('settings_default_computername', [ computerId ])
				};
			}

			AppSettings.set(settings, function(){
				_log('Saved computer id %s name %s', settings.computerId, settings.computerName);
			});
		});
	}

	function forceUpdateComputer() {
		AppSettings.get(['computers', 'computerName', 'computerId'], function(settings){
			var computer = settings.computers[settings.computerId];
			var currentTime = new Date().getTime();

			// make sure the computer doesn't get stale, we'll remove it from the menu after 30 days
			var previousTime = new Date(); previousTime.setDate(previousTime.getDate() - 7);
			if (computer.name === undefined || computer.update < previousTime.getTime()) {
				_log('Refreshing computers collection.');
				settings.computers[settings.computerId] = {
					name: settings.computerName,
					update: currentTime
				};
				AppSettings.set(settings);
			}
		});
	}

	// A generic context menu callback function.
	function contextMenuClick(info, tab, to) {
		_log("link " + info.linkUrl + " clicked");

		var data = {link: {from: computerId, url: info.linkUrl, to: to}};

		AppSettings.get('replacements', function(settings) {
			var replacements = settings.replacements || '';

			if (replacements.length > 0) {
				data.link.url = performRequestedReplacements(replacements, data.link.url);
			}

			// send link to other computer(s)
			AppSettings.set(data);
		});
	}

	function performRequestedReplacements(replacements, url) {
		var replaces = replacements.split(',');

		replaces.forEach(function(repl) {
			if (LinkReplacements[repl]) {
				var value = LinkReplacements[repl](url);
				if (value !== false) {
					url = value;
				}
			}
		});

		return url;
	}

	function storageChanged(changes, storageNamespace) {
		if (storageNamespace === 'sync') {
			if (changes.computers) {
				// reset the names
				createContextMenu(true);
			}

			if (changes.link) {
				AppSettings.get(['computers','link'], function(items){
					var link = items.link;

					// invalid data set
					if (!link || !link.from) return;

					_log('link received: ', link);

					// received my message, can be ignored
					if (link.from === computerId) return;

					// received message not for me, can be ignored
					if (link.to && link.to !== computerId) {
						_log('received message not for me, ignoring... (destined for %s)', link.to);
						return;
					};

					var computerName = 'Unnamed ' + link.from;
					if (items.computers && items.computers[link.from]) {
						computerName = items.computers[link.from];
						if (computerName.name) {
							computerName = computerName.name;
						}
					}

					_log('Opening link to %s from computer %s.',
							link.url, computerName);

					// received message from other computer, open the tab
					chrome.tabs.create({ url: link.url });
				});
			}
		} else if (storageNamespace === 'local') {
			if (changes.computerName) {
				_log('My Computerid: ', computerId);
				_log('ComputerName changed: ', changes.computerName.newValue);
				// my computer name changed, so send it to other computers

				AppSettings.get('computers', function(items){
					items.computers = items.computers || {};
					items.computers[computerId] = {
						name: changes.computerName.newValue,
						update: (new Date().getTime())
					};

					AppSettings.set(items);
				});
			}
			if (changes.socialShares) {
				// reset the menu
				createContextMenu(true);
			}
		}
	}

	findComputerId();
}());
