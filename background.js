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

// Set up context menu tree at install time.
function createContextMenu() {
  if(contextMenuId) return;

	console.log("created contextMenu");
  contextMenuId = chrome.contextMenus.create(
        {"title": "Open on other computer(s)",
          "contexts":['link'],
          "onclick": genericOnClick,
          "targetUrlPatterns":["http://*/*","https://*/*"]
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
  if (storageNamespace != 'sync') return;

  console.log('Sync\'d content incoming: ', changes);

  chrome.storage.sync.get(function(items){
    // invalid data set
    if (!items.from) return;

    // received my message, can be ignored
    if (items.from == computerId) return;

    console.log('Opening link to %s.', items.link);

    // received message from other computer, open the tab
    chrome.tabs.create({ url: items.link });
  });
});

findComputerId();
