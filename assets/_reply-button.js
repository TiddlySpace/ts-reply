/*
 * A new reply button for TiddlySpace
 *
 */

/*
 * Call this with the element you want to turn into a reply button
 */
function createReplyButton(el) {
	var $; // make sure jQuery is mapped to $ internally

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
	loadScript('/bags/common/tiddlers/jquery.js',
		function() {
			return (typeof window.jQuery !== 'undefined');
		}, function() {
			$ = jQuery;
			loadScript('/bags/tiddlyspace/tiddlers/chrjs',
				function() {
					return (typeof window.tiddlyweb !== 'undefined' &&
						typeof window.tiddlyweb.Tiddler === 'function');
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
			titleInTW, includedTitle,
			regex = /^(.*) \*\(@(.*)\)\*$/,
			htmlRep = jQuery('#title');
		if (tiddlywiki.length > 0) {
			// we're in a TiddlyWiki tiddler
			titleInTW = tiddlywiki.attr('tiddler');
			includedTitle = regex.exec(titleInTW);
			if (includedTitle) {
				// we're in an included tiddler
				return includedTitle.slice(1); // return the title and space
			} else {
				return titleInTW;
			}
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
				if (window.location.protocol === 'file:') {
					alert('You need to be online (i.e. not using a ' +
						'file:// uri) to reply to this tiddler');
				} else {
					alert('There was an error replying to this tiddler');
				}
			};

		jQuery.ajax({
			url: '/status',
			success: function(stat) {
				var title = getTitle(),
					host = stat.server_host,
					url, targetSpace,
					space = stat.username,
					tiddler;

				if (typeof title !== 'string') {
					targetSpace = title[1];
					title = title[0];
					tiddler = new tiddlyweb.Tiddler(title);
					tiddler.recipe = new tiddlyweb.Recipe(targetSpace +
						'_public', '/');
				} else {
					targetSpace = stat.space.name;
					tiddler = new tiddlyweb.Tiddler(title);
					tiddler.recipe = new tiddlyweb.Recipe(stat.space.recipe
						, '/');
				}

				url = host.scheme + '://' + space + '.' + host.host +
					((host.port === '80' || host.port === '443') ?
						'' : ':' + host.port) + '/_reply';

				tiddler.get(function(t) {
					var _source= t.route(),
						origin = targetSpace,
						currUser = stat.username,
						tags = t.tags.filter(function(tag) {
							return /^@/.test(tag) &&
								tag.slice(1) !== currUser;
						});

					if (!~tags.indexOf(t.modifier) && t.modifier !== currUser) {
						tags.push('@' + t.modifier);
					}

					if (!~tags.indexOf(t.creator) && t.creator !== currUser) {
						tags.push('@' + t.creator);
					}

					if (!~tags.indexOf(origin)) {
						tags.push('@' + origin);
					}

					callback({
						title: title,
						text: text,
						_source: _source,
						space: space,
						tags: tags,
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
			start: function(payload) {
				var diff = { y: $el.offset().top, x: $el.offset().left };
				oldCSS.top = $el.offset().top;
				oldCSS.left = $el.offset().left;
				oldCSS.right = $el.css('right');
				oldCSS.bottom = $el.css('bottom');
				oldCSS.height = $el.css('height');
				oldCSS.width = $el.css('width');
				oldCSS['max-height'] = $el.css('max-height');
				oldCSS['max-width'] = $el.css('max-width');
				oldCSS.margin = $el.css('margin');
				$el.css({
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					margin: 0,
					width: '100%',
					height: '100%',
					'max-height': 'none',
					'max-width': 'none'
				});
				$el[0].contentWindow.postMessage(JSON.stringify({
					type: 'initMove',
					diff: diff,
					id: randID
				}), urlBase);
			},
			stop: function(diff) {
				$el.css({
					top: oldCSS.top + diff.y,
					left: oldCSS.left + diff.x,
					right: oldCSS.right,
					bottom: oldCSS.bottom,
					//margin: oldCSS.margin,
					height: oldCSS.height,
					width: oldCSS.width,
					'max-height': oldCSS['max-height'],
					'max-width': oldCSS['max-width']
				});
				$el[0].contentWindow.postMessage(JSON.stringify({
					type: 'doneMove',
					id: randID
				}), urlBase);
			}
		};
	}

	function splitURL(url) {
		var parts = /^([^\/]+\/\/[^\/]+)(.*)$/.exec(url);
		parts.shift();
		return parts;
	}

	function sendMessage(message, url, fn) {
		var urlBase = splitURL(url)[0];

		stylesheet.innerHTML = style;
		document.body.appendChild(stylesheet);

		iframe = document.createElement('iframe');
		iframe.src = url;
		iframe.id = bookmarkletID;
		document.body.appendChild(iframe);

		iframe.addEventListener('load', function() {
			message.id = randID;
			iframe.contentWindow.postMessage(JSON.stringify(message), urlBase);
			fn();
		}, false);

		var $iframe = jQuery(iframe);
		var moveBookmarker = Mover($iframe, urlBase);

		window.addEventListener('message', function(event) {
			var message = JSON.parse(event.data);
			if (event.origin === urlBase && message.id === randID) {
				switch (message.type) {
					case 'close':
						closeBookmarker();
						break;
					case 'startMove':
						moveBookmarker.start(message.payload);
						break;
					case 'stopMove':
						moveBookmarker.stop(message.diff);
						break;
				}
			}
		}, false);
	}

	// attach the appropriate onclick handler
	function createButton() {
		el.style.cursor = 'pointer';
		$(el).click(function(event) {
			$(el).addClass('loading');
			event.preventDefault();
			// only show if the iframe isn't already loaded
			if (!document.getElementById(bookmarkletID)) {
				getInfo(function(message, url) {
					// check whether the reply popup is installed or not
					var urlParts = splitURL(url),
						fallback,
						tiddler = new tiddlyweb.Tiddler('_reply');
						tiddler.recipe = new tiddlyweb.Recipe(message.space +
							'_public', '/');

					fallback = function() {
						// They either don't have reply installed or their
						// browser doesn't support it
						window.location = urlParts[0] + '/#' + message.title;
						$(el).removeClass('loading');
					};

					// disable ControlView
					jQuery.ajaxSetup({
						beforeSend: function(xhr) {
							xhr.setRequestHeader('X-ControlView', false);
						}
					});

					if (typeof window.postMessage === 'undefined') {
						fallback();
					}

					tiddler.get(function() {
						// they have the fancy reply button installed
						sendMessage(message, url, function() {
							$(el).removeClass('loading');
						});
					}, fallback);
				});
			}
		});

		// when the button is clicked, any highlighted text disappears before
		// the event fires. This means we need to find the highlighted text on
		// highlight, rather than on button click...
		jQuery(document.body).mouseup(function(ev) {
			highlighter.setText();
		});
	}
}
