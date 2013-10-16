;(function(undefined){
    "use strict";

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

    chrome.runtime.onInstalled.addListener(createContextMenu);
    chrome.storage.onChanged.addListener(storageChanged);
    chrome.contextMenus.onClicked.addListener(contextMenuClicked);

    function i18n_msg(messageName, substitutions) {
        if (substitutions === undefined)
            return chrome.i18n.getMessage(messageName);

        return chrome.i18n.getMessage(messageName, substitutions);
    }

    // Set up context menu tree at install time.
    function createContextMenu(force) {
        if (contextMenuId && !force) return;

        chrome.storage.local.get(function(settings){
        chrome.storage.sync.get('computers', function(items){
            var otherComputers = 0;

            var addContextMenu = function(title, id, extra) {
                var opts = extra || {};
                opts.title = title;
                opts.id = id;
                opts.contexts = opts.contexts || ['link'];
                opts.targetUrlPatterns = opts.targetUrlPatterns || ['http://*/*','https://*/*'];
                return chrome.contextMenus.create(opts)
            }

            if(items.computers) {
                for (var c in items.computers) {
                    if(c !== computerId) {
                        otherComputers++;
                    }
                }
            }

            var wantsSocial = (settings.socialShares || '').length > 0;
            var useSubmenu = (otherComputers > 1) || wantsSocial;

            _log("creating contextMenu");

            chrome.contextMenus.removeAll();

            if(!useSubmenu){
                contextMenuId = addContextMenu(i18n_msg('contextmenu_share_single'), 'all');
            } else {
                contextMenuId = addContextMenu(i18n_msg('contextmenu_share_multi'), 'base');

                _log('Adding child menus for computers.');
                addContextMenu(i18n_msg('contextmenu_share_all'), 'all', {'parentId': contextMenuId});

                if (otherComputers > 1) {
                    for (var c in items.computers) {
                        if(c !== computerId) {
                            var menu = i18n_msg('contextmenu_share_computer', [items.computers[c]]);
                            addContextMenu(menu, 'computer_' + c, {'parentId': contextMenuId});
                        }
                    }
                }

                addContextMenu('sep1', 'sep1', {'parentId': contextMenuId, 'type': 'separator'});

                if(wantsSocial) {
                    for (var s in shareUrls) {
                        if(settings.socialShares.indexOf(s) > -1) {
                            var menu = i18n_msg('contextmenu_social_' + s);
                            addContextMenu(menu, 'social_' + s, {'parentId': contextMenuId});
                        }
                    }

                    addContextMenu('sep2', 'sep2', {'parentId': contextMenuId, 'type': 'separator'});
                }

                addContextMenu(i18n_msg('contextmenu_configure'), 'settings', {'parentId': contextMenuId});
            }
        });
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
        if(computerId) return;

        chrome.storage.local.get(null, function(settings){
            var error = chrome.runtime ?
                                    chrome.runtime.lastError : chrome.extension.lastError;
            if (error) {
                _error('Unable to load local data: %s', error);
                alert('Unable to load local data: ' + error);
            }

            if (settings && settings.computerId) {
                computerId = settings.computerId;
                _log('Found computerid: %s', computerId);
                if(settings.computerName) {
                    _log('Found computerName: %s', settings.computerName);
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

            chrome.storage.local.set(settings, function(){
                var error = chrome.runtime ?
                                        chrome.runtime.lastError : chrome.extension.lastError;
                if (error) {
                    _error('Unable to save local data: %s', error);
                    alert('Unable to save local data: ' + error);
                }

                _log('Saved computer id %s name %s', settings.computerId, settings.computerName);
            });
        });
    }

    // A generic context menu callback function.
    function contextMenuClick(info, tab, to) {
        _log("link " + info.linkUrl + " clicked");

        var data = {from: computerId, link: info.linkUrl, to: to || null};

        // send link to other computer(s)
        setSyncStorage(data);
    }

    function setSyncStorage(data, callback) {
        chrome.storage.sync.set(data, function(){
            var error = chrome.runtime ?
                                    chrome.runtime.lastError : chrome.extension.lastError;
            if (error) {
                _error('Unable to sync data: %s', error);
                alert('Unable to sync data: ' + error);
            }

            if(callback) callback();
        });
    }

    function storageChanged(changes, storageNamespace) {
        if (storageNamespace === 'sync') {
            _log('Sync\'d content incoming: ', changes);
            _log('My Computerid: ', computerId);

            if (changes.computers) {
                // reset the names
                createContextMenu(true);
                return;
            }

            if (changes.link) {
                chrome.storage.sync.get(function(items){
                    // invalid data set
                    if (!items.from || !items.link) return;

                    // received my message, can be ignored
                    if (items.from === computerId) return;

                    // received message not for me, can be ignored
                    if (items.to && items.to !== computerId) {
                        _log('received message not for me, ignoring... (destined for %s)', items.to);
                        return;
                    };

                    var computerName = 'Unnamed ' + items.from;
                    if (items.computers && items.computers[items.from]) {
                        computerName = items.computers[items.from];
                    }

                    _log('Opening link to %s from computer %s.',
                            items.link, computerName);

                    // received message from other computer, open the tab
                    chrome.tabs.create({ url: items.link });
                });
            }
        } else if (storageNamespace === 'local') {
            if (changes.computerName) {
                // my computer name changed, so send it to other computers

                chrome.storage.sync.get(function(items){
                    items.from = computerId;
                    items.computers = items.computers || {};
                    items.computers[computerId] = changes.computerName.newValue;
                    items.link = null;

                    setSyncStorage(items);
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
