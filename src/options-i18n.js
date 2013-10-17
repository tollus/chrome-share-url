;(function($,undefined){

	$(init);

	function init() {
		$('[i18n-content]').each(function(){
			var attr = this.getAttribute('i18n-content');
			if (attr !== null) {
				var msg = chrome.i18n.getMessage(attr);
				if (msg !== '') {
					this.textContent = msg;
					this.removeAttribute('i18n-content');
				}
			}
		});
	}

}(jQuery));