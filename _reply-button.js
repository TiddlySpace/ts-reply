/*
 * A new reply button for TiddlySpace
 *
 */

/*
 * Call this with the element you want to turn into a reply button
 */
function createReplyButton(el) {

	//load jQuery
	function loadScript(url, testFn, callback) {
		if (!testFn()) {
			var scr = document.createElement('script');
			scr.type = 'text/javascript';
			scr.src = url;
			scr.onload = scr.onreadystatechange = function() {
				if (testFn()) {
					callback();
				}
			};
			document.body.appendChild(scr);
		} else {
			setTimeout(callback, 50);
		}
	}

	// load jQuery, then load chrjs
	loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js',
		function() {
			return (typeof window.jQuery !== 'undefined');
		}, function() {
			loadScript('http://tiddlyspace.com/bags/tiddlyspace/tiddlers/chrjs',
				function() {
					return (typeof window.tiddlyweb !== 'undefined');
				}, createButton);
		});

	function Highlighter () {
		this.text = '';
	}
	Highlighter.prototype.setText = function() {
		var self = this,
			newText = '';
		if (window.getSelection) {
			newText = window.getSelection().toString();
		} else if (document.getSelection) {
			newText = document.getSelection();
		} else if (document.selection) {
			newText = document.selection.createRange().text;
		}

		if (newText === '') {
			// nothing is highlighted. Hold off briefly on clearing the text as
			// this may be a button click that needs it
			window.setTimeout(function() {
				self.text = '';
			}, 100);
		} else {
			this.text = newText;
		}
	};
	Highlighter.prototype.getText = function() {
		return this.text;
	};

	var highlighter = new Highlighter();

	function getTitle() {
		var tiddlywiki = jQuery(el).closest('[tiddler].tiddler'),
			htmlRep = jQuery('#title');
		if (tiddlywiki.length > 0) {
			// we're in a TiddlyWiki tiddler
			return tiddlywiki.attr('tiddler');
		} else if (htmlRep.length > 0) {
			// we're in the HTML representation (or similar)
			return htmlRep.text();
		} else {
			return document.title;
		}
	}

	function getInfo(callback) {
		var text = highlighter.getText();
			error = function() {
				alert('There was an error replying to this tiddler');
			};

		jQuery.ajax({
			url: '/status',
			success: function(stat) {
				var title = getTitle(),
					host = stat.server_host,
					url,
					space = stat.username,
					tiddler = new tiddlyweb.Tiddler(title);
					tiddler.recipe = new tiddlyweb.Recipe(stat.space.recipe,
						'/');

				url = host.scheme + '://' + space + '.' + host.host +
					((host.port === '80' || host.port === '443') ?
						'' : host.port) + '/_reply';

				tiddler.get(function(t) {
					var _source= t.route(),
						origin = stat.space.name;

					callback({
						title: title,
						text: text,
						_source: _source,
						space: space,
						origin: origin
					}, url);
				}, error);
			},
			error: error
		});
	}


	var iframe,
		stylesheet = document.createElement('style'),
		randID = ('' + Math.random()).slice(2),
		bookmarkletID = 'bookmarklet' + randID,
		style = [
			'#' + bookmarkletID + ' {',
			'width: 555px;',
			'height: 87%;',
			'max-height: 527px;',
			'min-height: 300px;',
			'position: fixed;',
			'top: 0;',
			'left: 0;',
			'bottom: 0;',
			'margin: 5% 25%;',
			'z-index: 10000;',
			'border: 0;',
			'}',
			'@media all and (min-width: 1360px) {',
			'#' + bookmarkletID + ' {',
			'margin: 10% 30%;',
			'}',
			'}',
			'@media all and (max-width: 800px) {',
			'#' + bookmarkletID + ' {',
			'margin: 10%;',
			'}',
			'}',
			'@media all and (max-width: 600px) {',
			'#' + bookmarkletID + ' {',
			'margin: 10% 5%;',
			'}',
			'}',
			'@media all and (max-width: 550px) {',
			'#' + bookmarkletID + ' {',
			'margin: 10% 0;',
			'width: 100%;',
			'}',
			'}'
		].join('\n');

	function closeBookmarker() {
		document.body.removeChild(iframe);
	}

	function Mover($el, urlBase) {
		var borderSize,
			oldCSS = {},
			devMode = /csrf_token=[0-9]{10}:bengillies/.test(document.cookie);

		return {
			move: function(pos) {
				if (devMode) {
					console.log('y: ', pos.y, 'x: ', pos.x);
				}
				$el.animate({
					top: '+=' + pos.y,
					left: '+=' + pos.x
				}, 0);
			},
			start: function(payload) {
				oldCSS.height = $el.css('height');
				oldCSS['max-height'] = $el.css('max-height');
				borderSize = payload.borderSize;
				$el.css({
					'height': $el.height() + (borderSize * 2),
					'max-height': 'none'
				});
				$el.animate({
					top: '-=' + borderSize,
					left: '-=' + borderSize,
					width: '+=' + borderSize * 2
				}, 0);
				$el[0].contentWindow.postMessage('initMove', urlBase);
			},
			stop: function() {
				$el.animate({
					top: '+=' + borderSize,
					left: '+=' + borderSize,
					width: '-=' + borderSize * 2
				}, 0);
				$el.css(oldCSS);
				$el[0].contentWindow.postMessage('initMove', urlBase);
			}
		};
	}

	function splitURL(url) {
		var parts = /^([^\/]+\/\/[^\/]+)(.*)$/.exec(url);
		parts.shift();
		return parts;
	}

	function sendMessage(message, url) {
		var urlBase = splitURL(url)[0];

		stylesheet.innerHTML = style;
		document.body.appendChild(stylesheet);

		iframe = document.createElement('iframe');
		iframe.src = url;
		iframe.id = bookmarkletID;
		document.body.appendChild(iframe);

		iframe.addEventListener('load', function() {
			iframe.contentWindow.postMessage(JSON.stringify(message), urlBase);
		}, false);

		var $iframe = jQuery(iframe);
		var moveBookmarker = Mover($iframe, urlBase);

		window.addEventListener('message', function(event) {
			if (event.origin === urlBase) {
				var message = JSON.parse(event.data);
				switch (message.type) {
					case 'close':
						closeBookmarker();
						break;
					case 'move':
						moveBookmarker.move(message.payload);
						break;
					case 'startMove':
						moveBookmarker.start(message.payload);
						break;
					case 'stopMove':
						moveBookmarker.stop();
						break;
				}
			}
		}, false);
	}

	// attach the appropriate onclick handler
	function createButton() {
		el.style.cursor = 'pointer';
		el.addEventListener('click', function(event) {
			event.preventDefault();
			// only show if the iframe isn't already loaded
			if (!document.getElementById(bookmarkletID)) {
				getInfo(function(message, url) {
					// check whether the reply popup is installed or not
					var urlParts = splitURL(url),
						tiddler = new tiddlyweb.Tiddler('_reply');
						tiddler.recipe = new tiddlyweb.Recipe(message.space +
							'_public', '/');

					// disable ControlView
					jQuery.ajaxSetup({
						beforeSend: function(xhr) {
							xhr.setRequestHeader('X-ControlView', false);
						}
					});

					tiddler.get(function() {
						// they have the fancy reply button installed
						sendMessage(message, url);
					}, function() {
						// they don't. Just link to the tiddler
						window.location = urlParts[0] + '/#' + message.title;
					});
				});
			}
		}, false);

		// when the button is clicked, any highlighted text disappears before
		// the event fires. This means we need to find the highlighted text on
		// highlight, rather than on button click...
		jQuery(document.body).mouseup(function(ev) {
			highlighter.setText();
		});
	}
}
