.PHONY: build image

build: image
	cat _reply.html.meta assets/_reply.html > _reply.tid
	cat _reply.js.meta assets/_reply.js > _reply.js.tid
	cat _reply-loader.js.meta assets/_reply-loader.js > _reply-loader.js.tid
	cat _reply-button.js.meta assets/_reply-button.js > _reply-button.js.tid

image:
	base64 assets/reply.png > .reply.png.base64
	cat reply.png.meta .reply.png.base64 > reply.png.tid
	rm .reply.png.base64
