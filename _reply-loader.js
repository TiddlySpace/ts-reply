/*
 * A new bookmarklet for replying to tiddlers in TiddlySpace
 *
 * Use the following Bookmarklet to test:
 * javascript:(function(a,b)%7Ba=b.createElement('script');a.setAttribute('src','http://reply.tiddlyspace.com/_reply-loader.js');b.body.appendChild(a);a.addEventListener('load',function()%7BloadBookmarker('http://reply.tiddlyspace.com/_reply','reply');%7D,false);%7D(null,document))
 */

function loadBookmarker(url, space) {

	//load jQuery
	if (typeof window.jQuery === 'undefined') {
		var jQEl = document.createElement('script');
		jQEl.type = 'text/javascript';
		jQEl.src = 'http://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js';
		jQEl.onload = jQEl.onreadystatechange = function() {
			if (typeof window.jQuery !== 'undefined') {
				sendMessage();
			}
		};
		document.body.appendChild(jQEl);
	} else {
		setTimeout(sendMessage, 50);
	}

	function getText() {
		var text = '';
		if (window.getSelection) {
			text = window.getSelection().toString();
		} else if (document.getSelection) {
			text = document.getSelection();
		} else if (document.selection) {
			text = document.selection.createRange().text;
		} else {
			text = '';
		}

		if (text === '') {
			var $el = jQuery('.main');
			text = ($el.length > 0) ? $el[0].innerText : '';
		}

		return text;
	}

	var container = document.createElement('div'),
		iframe = document.createElement('iframe'),
		stylesheet = document.createElement('style'),
		randID = ('' + Math.random()).slice(2),
		bookmarkletID = 'bookmarklet' + randID,
		cloakID = 'cloak' + randID,
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
			'margin: 10% 25%;',
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
			'}',
			'#' + cloakID + ' {',
			'position: fixed;',
			'top: 0;',
			'bottom: 0;',
			'left: 0;',
			'right: 0;',
			'background-color: rgba(11, 18, 29, 0.6);',
			'z-index: 9999;',
			'}'
		].join('\n');
		urlBase = url.replace(/^(.*)([^\/])(\/[^\/].*)/,
				function($0, $1, $2) {
					return ($1) ? $1 + $2 : '';
				});

	function closeBookmarker() {
		document.body.removeChild(container);
	}


	function sendMessage() {
		stylesheet.innerHTML = style;
		document.body.appendChild(stylesheet);

		iframe.src = url;
		iframe.id = bookmarkletID;
		container.appendChild(iframe);

		container.id = cloakID;
		document.body.appendChild(container);

		iframe.addEventListener('load', function() {
			jQuery.ajax({
				url: '/status',
				success: function(stat) {
					var message = JSON.stringify({
							title: document.title,
							'_source': window.location.href,
							space: space,
							text: getText(),
							origin: stat.space.name
						});
					iframe.contentWindow.postMessage(message, urlBase);
				},
				error: function() {
					alert('There was an issue replying to this tiddler.');
				}
			});
		}, false);

		window.addEventListener('message', function(event) {
			if ((event.origin === urlBase) && (event.data === 'close')) {
					closeBookmarker();
			}
		}, false);
	}


	container.addEventListener('click', function() {
		closeBookmarker();
	});
}
