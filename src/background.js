var computerId = null;

// A generic onclick callback function.
function genericOnClick(info, tab) {
	console.log("link " + info.linkUrl + " clicked");

  var data = {from: computerId, link: info.linkUrl};

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
  	console.log("created contextMenu");
    contextMenuId = chrome.contextMenus.create(
          {"title": "Open on other computer(s)",
            "contexts":['link'],
            "onclick": genericOnClick,
            "targetUrlPatterns":["http://*/*","https://*/*"]
           });

    if(items.computers && (items.computers.length > 1 || !items.computers[computerId])) {
      child = chrome.contextMenus.create({
        'title': 'Send to all',
        'onclick': genericOnClick,
        'parentId': contextMenuId
      });

      console.log('Adding child menus for computers.');
      for (var c in items.computers) {
        if(c != computerId) {
          menuData[c] = chrome.contextMenus.create({
            'title': 'Send to ' + items.computers[c],
            'onclick': genericOnClick,
            'parentId': contextMenuId
          });
        }
      }
    }
  });
};

function findComputerId(){
  if(computerId) return;

  findComputerId = function(){};

  chrome.storage.local.get(function(items){
    var error = chrome.runtime ?
                chrome.runtime.lastError : chrome.extension.lastError;
    if (error) {
      console.error('Unable to load local data: %s', error);
      alert('Unable to load local data: ' + error);
    }

    if (items && items.computerId) {
      computerId = items.computerId;
      console.log('Found computerid: %s', computerId);
      return;
    }

    computerId = Math.round(Math.random() * Date.now() * 1000).toString(36);
    chrome.storage.local.set({computerId: computerId}, function(){
      var error = chrome.runtime ?
                  chrome.runtime.lastError : chrome.extension.lastError;
      if (error) {
        console.error('Unable to save local data: %s', error);
        alert('Unable to save local data: ' + error);
      }

      console.log('Saved computerid: %s', computerId);
    })

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
