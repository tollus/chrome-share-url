var computerId = null;

// A generic onclick callback function.
function genericOnClick(info, tab) {
	console.log("link " + info.linkUrl + " clicked");

  var data = {from: computerId, link: info.linkUrl, to: null};

  if (info.menuItemId !== contextMenuId){
    for( var x in menuData ){
      if(menuData[x] == info.menuItemId) {
        data.to = x;
      }
    }
  }

  chrome.storage.sync.set(data, function(){
    var error = chrome.runtime ?
                chrome.runtime.lastError : chrome.extension.lastError;
    if (error) {
      console.error('Unable to sync data: %s', error);
      alert('Unable to sync data: ' + error);
    }
  });
}

var contextMenuId;
var menuData;

// Set up context menu tree at install time.
function createContextMenu(force) {
  if (contextMenuId && !force) return;

  if (contextMenuId) {
    chrome.contextMenus.removeAll();
  }
  menuData = {};

  chrome.storage.sync.get('computers', function(items){
    var otherComputers = 0;

    if(items.computers) {
      for (var c in items.computers) {
        if(c != computerId) {
          otherComputers++;
        }
      }
    }

    var useSubmenu = (otherComputers > 1);

  	console.log("creating contextMenu");

    if(!useSubmenu){
      contextMenuId = chrome.contextMenus.create(
          {'title': 'Open on other computer',
            'onclick': genericOnClick,
            'contexts':['link'],
            'targetUrlPatterns':['http://*/*','https://*/*']
           });
    } else {
      contextMenuId = chrome.contextMenus.create(
          {'title': 'Open on other computers',
            'onclick': genericOnClick,
            'contexts':['link'],
            'targetUrlPatterns':['http://*/*','https://*/*']
           });

      console.log('Adding child menus for computers.');
      child = chrome.contextMenus.create({
        'title': 'Send to all',
        'parentId': contextMenuId,
        'onclick': genericOnClick,
        'contexts':['link'],
        'targetUrlPatterns':['http://*/*','https://*/*']
      });

      for (var c in items.computers) {
        if(c != computerId) {
          menuData[c] = chrome.contextMenus.create({
            'title': 'Send to ' + items.computers[c],
            'parentId': contextMenuId,
            'onclick': genericOnClick,
            'contexts':['link'],
            'targetUrlPatterns':['http://*/*','https://*/*']
          });
        }
      }

      chrome.contextMenus.create({
        'parentId': contextMenuId,
        'type': 'separator',
        'contexts':['link'],
        'targetUrlPatterns':['http://*/*','https://*/*']
      });

      chrome.contextMenus.create({
        'title': 'Configure this computer\'s name',
        'parentId': contextMenuId,
        'contexts':['link'],
        'targetUrlPatterns':['http://*/*','https://*/*'],
        'onclick': openOptionsTab
      })
    }
  });
};

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

  findComputerId = function(){};

  chrome.storage.local.get(function(settings){
    var error = chrome.runtime ?
                chrome.runtime.lastError : chrome.extension.lastError;
    if (error) {
      console.error('Unable to load local data: %s', error);
      alert('Unable to load local data: ' + error);
    }

    if (settings && settings.computerId) {
      computerId = settings.computerId;
      console.log('Found computerid: %s', computerId);
      if(settings.computerName) {
        console.log('Found computerName: %s', settings.computerName);
        return;
      } else {
        settings.computerName = 'Unnamed ' + computerId;
      }
    } else {
      computerId = Math.round(Math.random() * Date.now() * 1000).toString(36);
      settings = {
        'computerId': computerId,
        'computerName': 'Unnamed ' + computerId
      };
    }

    chrome.storage.local.set(settings, function(){
      var error = chrome.runtime ?
                  chrome.runtime.lastError : chrome.extension.lastError;
      if (error) {
        console.error('Unable to save local data: %s', error);
        alert('Unable to save local data: ' + error);
      }

      console.log('Saved computer id %s name %s', settings.computerId, settings.computerName);
    });
  });
}

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

chrome.storage.onChanged.addListener(function(changes, storageNamespace) {
  if (storageNamespace == 'sync') {
    console.log('Sync\'d content incoming: ', changes);

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
        if (items.from == computerId) return;

        // received message not for me, can be ignored
        if (items.to && items.to != computerId) {
          console.log('received message not for me, ignoring... (destined for %s)', items.to);
          return;
        };

        var computerName = 'Unnamed ' + items.from;
        if (items.computers && items.computers[items.from]) {
          computerName = items.computers[items.from];
        }

        console.log('Opening link to %s from computer %s.',
            items.link, computerName);

        // received message from other computer, open the tab
        chrome.tabs.create({ url: items.link });
      });
    }
  } else if (storageNamespace == 'local') {
    if (changes.computerName) {
      // my computer name changed, so send it to other computers

      chrome.storage.sync.get(function(items){
        items.from = computerId;
        items.computers = items.computers || {};
        items.computers[computerId] = changes.computerName.newValue;
        items.link = null;

        chrome.storage.sync.set(items);
      });
    }
  }
});

findComputerId();
