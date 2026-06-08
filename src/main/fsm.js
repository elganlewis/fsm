var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];

function convertLatexShortcuts(text) {
	// html greek characters
	for(var i = 0; i < greekLetterNames.length; i++) {
		var name = greekLetterNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
	}

	// subscripts
	for(var i = 0; i < 10; i++) {
		text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
	}

	return text;
}

function textToXML(text) {
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var result = '';
	for(var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if(c >= 0x20 && c <= 0x7E) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - arrowLength * dx + arrowWidth * dy, y - arrowLength * dy - arrowWidth * dx);
	c.lineTo(x- 7*arrowLength/8 * dx, y - 7*arrowLength/8 * dy)
	c.lineTo(x - arrowLength * dx - arrowWidth * dy, y - arrowLength * dy + arrowWidth * dx);
	c.fill();
}

function canvasHasFocus() {
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var arrowLength = 8;
var arrowWidth = 3.5;
var arrowAngle = Math.PI / 4;
var selfLinkRadiusScale = 0.6;
var selfLinkArrowAngle = Math.PI * 0.44;
var selfLinkOffset;
var diagramScale = 1;
var nodeFillColor = '#ececec';
var nodes = [];
var links = [];

var arrowSide = -2;
var showGrid = false;
var isCircle = false;
var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link, a Node, or a Selection
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

// Event Listeners
document.addEventListener("DOMContentLoaded", function() {
	// Toggle Grid
	const grid = document.getElementById("toggleGrid");
	if (grid) {grid.addEventListener("change", e => toggleGrid(e.target));}

	// Clear Canvas
	const clearCanv = document.getElementById("clearCanvasBtn");
	if (clearCanv) {clearCanv.addEventListener("click", clearCanvas);};
  	
	// Restore Backup
	const restBack = document.getElementById("restoreBackupBtn");
	if (restBack) {restBack.addEventListener("click", restoreSavedBackup);};

	// Angle Values
	document.getElementById("selfLinkArrowAngleValue").addEventListener(
		"click", e => toggleAngleValue(e.target, "selfLinkArrowAngle")
	);
	document.getElementById("arrowAngleValue").addEventListener(
		"click", e => toggleAngleValue(e.target, "arrowAngle")
	);

	// Arrow Side
	document.getElementById("arrowAngleValue").addEventListener("click", changeArrowSide);

	// Circle Self Link
	document.getElementById("circleSelfLink").addEventListener(
		"change", e => toggleCircle(e.target)
	);

	const sliders = [
		"nodeRadius",
		"arrowLength",
		"arrowWidth",
		"arrowAngle",
		"selfLinkRadiusScale",
		"selfLinkArrowAngle",
		"diagramScale",
		"nodeFillColor"
	];

	sliders.forEach(setSliderListener);

	// Save As
	const saveAsTypes = {
		"savePng": saveAsPNG,
		"saveSvg": saveAsSVG,
		"saveLatex": saveAsLaTeX,
		"saveJson": saveAsJSON
	};

	for (const [key, fn] of Object.entries(saveAsTypes)) {
		document.getElementById(key).addEventListener("click", fn);
	};

	// imports
	document.getElementById("json-file").addEventListener("change", e => loadFromJSONFile(e.target));
	document.getElementById("importBtn").addEventListener(
		"click",
		function() {
			document.getElementById("json-file").click();
		}
	)

});

function setSliderListener(name) {
	document.getElementsByName(name).forEach(input => {
		input.addEventListener("input", e => setScaleValue(e.target));
	});
}

function Selection() {
	this.nodes = nodes.slice();
	this.links = links.slice();
	this.nodeStartPositions = [];
	this.mouseStartX = 0;
	this.mouseStartY = 0;
}

Selection.prototype.containsObject = function(object) {
	for(var i = 0; i < this.nodes.length; i++) {
		if(this.nodes[i] == object) return true;
	}
	for(var i = 0; i < this.links.length; i++) {
		if(this.links[i] == object) return true;
	}
	return false;
};

Selection.prototype.setMouseStart = function(x, y) {
	this.mouseStartX = x;
	this.mouseStartY = y;
	this.nodeStartPositions = [];
	for(var i = 0; i < this.nodes.length; i++) {
		this.nodeStartPositions.push({
			'node': this.nodes[i],
			'x': this.nodes[i].x,
			'y': this.nodes[i].y
		});
	}
};

Selection.prototype.setAnchorPoint = function(x, y) {
	var dx = x - this.mouseStartX;
	var dy = y - this.mouseStartY;
	for(var i = 0; i < this.nodeStartPositions.length; i++) {
		var start = this.nodeStartPositions[i];
		start.node.x = start.x + dx;
		start.node.y = start.y + dy;
	}
};

function isObjectSelected(object) {
	return selectedObject == object || (selectedObject instanceof Selection && selectedObject.containsObject(object));
}

function updateSelfLinkOffset() {
	var offsetRadicand = Math.max(0, 1 - Math.pow(Math.sin(arrowAngle) * selfLinkRadiusScale, 2));
	selfLinkOffset = selfLinkRadiusScale * Math.cos(arrowAngle) + Math.sqrt(offsetRadicand);
}

function changeArrowSide() {
	if (arrowSide == 0) {
		arrowSide = -2;
	} else {
		arrowSide = 0;
	}
	draw();
}

updateSelfLinkOffset();

function setScaleValue(input) {
	var value = parseFloat(input.value);
	var outputValue = input.value;
	if(input.name == 'nodeRadius') {
		nodeRadius = value;
	} else if(input.name == 'arrowLength') {
		arrowLength = value;
	} else if(input.name == 'arrowWidth') {
		arrowWidth = value;
	} else if(input.name == 'arrowAngle') {
		arrowAngle = value * Math.PI / 180;
	} else if(input.name == 'selfLinkRadiusScale') {
		selfLinkRadiusScale = value;
	} else if(input.name == 'selfLinkArrowAngle') {
		selfLinkArrowAngle = value * Math.PI / 180;
	} else if(input.name == 'diagramScale') {
		diagramScale = value;
	} else if(input.name == 'nodeFillColor') {
		nodeFillColor = input.value;
	}
	
	updateSelfLinkOffset();
	updateScaleValueOutput(input.name, outputValue);
	draw();
}

function isAngleScaleValue(name) {
	return name == 'arrowAngle' || name == 'selfLinkArrowAngle';
}

function formatScaleValue(name, value, unit) {
	if(name == 'nodeFillColor') {
		return value;
	}
	if(isAngleScaleValue(name)) {
		if(unit == 'rad') {
			return parseFloat((value * Math.PI / 180).toFixed(3)) + ' rad';
		}
		return value + ' deg';
	}
	return name == 'diagramScale' ? value + 'x' : value;
}

function updateScaleValueOutput(name, value) {
	var output = document.getElementById(name + 'Value');
	var unit = output.getAttribute('data-unit') || 'deg';
	output.textContent = formatScaleValue(name, value, unit);
}

function toggleAngleValue(output, name) {
	var input = document.getElementsByName(name)[0];
	var nextUnit = (output.getAttribute('data-unit') || 'deg') == 'deg' ? 'rad' : 'deg';
	output.setAttribute('data-unit', nextUnit);
	output.textContent = formatScaleValue(name, parseFloat(input.value), nextUnit);
}

function screenToDiagramPoint(point) {
	return {
		'x': (point.x - canvas.width / 2) / diagramScale + canvas.width / 2,
		'y': (point.y - canvas.height / 2) / diagramScale + canvas.height / 2
	};
}

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	
	if(showGrid && c instanceof CanvasRenderingContext2D) {
		drawGrid(c);
	}

	c.save();
	if(c instanceof CanvasRenderingContext2D) {
		c.translate(canvas.width / 2, canvas.height / 2);
		c.scale(diagramScale, diagramScale);
		c.translate(-canvas.width / 2, -canvas.height / 2);
	}
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = isObjectSelected(nodes[i]) ? 'blue' : 'black';
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = isObjectSelected(links[i]) ? 'blue' : 'black';
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	saveBackup();
}

function drawGrid(c) {
	var spacing = 20;

	c.save();
	c.strokeStyle = '#e6e6e6';
	c.lineWidth = 1;

	for(var x = 0; x <= canvas.width; x += spacing) {
		c.beginPath();
		c.moveTo(x, 0);
		c.lineTo(x, canvas.height);
		c.stroke();
	}

	for(var y = 0; y <= canvas.height; y += spacing) {
		c.beginPath();
		c.moveTo(0, y);
		c.lineTo(canvas.width, y);
		c.stroke();
	}

	c.restore();
}

function toggleGrid(checkbox) {
	showGrid = checkbox.checked;
	draw();
}

function toggleCircle(checkbox) {
	isCircle = !isCircle;
	updateBackup()
	draw();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function() {
	canvas = document.getElementById('canvas');
	restoreBackup();
	draw();

	canvas.onmousedown = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		var clickedObject = selectObject(mouse.x, mouse.y);
		if(!(selectedObject instanceof Selection && selectedObject.containsObject(clickedObject))) {
			selectedObject = clickedObject;
		}
		movingObject = false;
		originalClick = mouse;

		if(selectedObject != null) {
			if(shift && selectedObject instanceof Node) {
				if (isCircle) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else {
					currentLink = new SelfLinkEllipse(selectedObject, mouse);
				}
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if(canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);

		if(selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			draw();
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if(currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if(targetNode == selectedObject) {
					if (isCircle) {
						currentLink = new SelfLink(selectedObject, mouse);
					} else {
						currentLink = new SelfLinkEllipse(selectedObject, mouse);
					}
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;

document.onkeydown = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = true;
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 65 && (e.ctrlKey || e.metaKey)) { // ctrl/cmd + A
		if(nodes.length > 0 || links.length > 0) {
			selectedObject = new Selection();
			resetCaret();
			draw();
		}
		return false;
	} else if(key == 8) { // backspace key
		if(selectedObject != null && 'text' in selectedObject) {
			selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
			resetCaret();
			draw();
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 46) { // delete key
		if(selectedObject != null) {
			if(selectedObject instanceof Selection) {
				nodes = [];
				links = [];
			} else {
				for(var i = 0; i < nodes.length; i++) {
					if(nodes[i] == selectedObject) {
						nodes.splice(i--, 1);
					}
				}
				for(var i = 0; i < links.length; i++) {
					if(links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
						links.splice(i--, 1);
					}
				}
			}
			selectedObject = null;
			draw();
		}
	}
};

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = false;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if(key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return screenToDiagramPoint({
		'x': mouse.x - element.x,
		'y': mouse.y - element.y
	});
}

function output(text) {
	var element = document.getElementById('output');
	element.style.display = 'block';
	element.value = text;
}

function texDataSnippet(texData) {
	var start = texData.indexOf('\\definecolor');
	var endMarker = '\\end{center}';
	var end = texData.indexOf(endMarker);

	if(start == -1 || end == -1) {
		return texData;
	}
	return texData.substring(start, end + endMarker.length);
}

function saveAsPNG() {
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'));
	selectedObject = oldSelectedObject;
	draw();

	canvas.toBlob(function(blob) {
		if(!blob) {
			alert('Could not save this FSM as a PNG.');
			return;
		}

		var url = URL.createObjectURL(blob);
		var link = document.createElement('a');
		link.href = url;
		link.download = 'fsm.png';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, 'image/png');
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	output(svgData);
	// Chrome isn't ready for this yet, the 'Save As' menu item is disabled
	// document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	output(texData);
	var snippet = texDataSnippet(texData);
	
	// Copy the text to clipboard
	navigator.clipboard.writeText(snippet);
}
