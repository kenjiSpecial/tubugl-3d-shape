'use strict';

import App from './index';

let app;

init();
start();

function init() {
	app = new App({
		isDebug: true
	});

	document.body.appendChild(app.canvas);
	app.canvas.addEventListener('mousemove', onDocumentMouseMove, false);
	app.canvas.addEventListener('mousedown', onDocumentMouseDown, false);
	app.canvas.addEventListener('mouseup', onDocumentMouseUp, false);
}

function start() {
	app.animateIn();
}

function onDocumentMouseMove(event) {
	let mouseX = event.clientX / window.innerWidth * 2 - 1;
	let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

	app.mouseMoveHandler({ x: mouseX, y: mouseY });
}

function onDocumentMouseDown(event) {
	let mouseX = event.clientX / window.innerWidth * 2 - 1;
	let mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

	app.mouseDownHandler({ x: mouseX, y: mouseY });
}

function onDocumentMouseUp() {
	app.mouseupHandler();
}

window.addEventListener('resize', function() {
	app.resize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', function(ev) {
	app.onKeyDown(ev);
});
