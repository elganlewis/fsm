function restoreBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	try {
		loadBackup(JSON.parse(localStorage['fsm']));
	} catch(e) {
		localStorage['fsm'] = '';
	}
}

function clearCanvas() {
	clearInterval(caretTimer);
	caretVisible = true;
	nodes = [];
	links = [];
	selectedObject = null;
	currentLink = null;
	movingObject = false;
	drawUsing(canvas.getContext('2d'));
}

function restoreSavedBackup() {
	restoreBackup();
	draw();
}

function createBackup() {
	var backup = {
		'nodes': [],
		'links': [],
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isAcceptState': node.isAcceptState,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof SelfLinkEllipse) {
			backupLink = {
				'type': 'SelfLinkEllipse',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	return backup;
}

function loadBackup(backup) {
	nodes = [];
	links = [];
	selectedObject = null;
	currentLink = null;

	for(var i = 0; i < backup.nodes.length; i++) {
		var backupNode = backup.nodes[i];
		var node = new Node(backupNode.x, backupNode.y);
		node.isAcceptState = backupNode.isAcceptState;
		node.text = backupNode.text;
		nodes.push(node);
	}
	for(var i = 0; i < backup.links.length; i++) {
		var backupLink = backup.links[i];
		var link = null;
		if(backupLink.type == 'SelfLink') {
			link = new SelfLink(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'SelfLinkEllipse') {
			link = new SelfLinkEllipse(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'StartLink') {
			link = new StartLink(nodes[backupLink.node]);
			link.deltaX = backupLink.deltaX;
			link.deltaY = backupLink.deltaY;
			link.text = backupLink.text;
		} else if(backupLink.type == 'Link') {
			link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
			link.parallelPart = backupLink.parallelPart;
			link.perpendicularPart = backupLink.perpendicularPart;
			link.text = backupLink.text;
			link.lineAngleAdjust = backupLink.lineAngleAdjust;
		}
		if(link != null) {
			links.push(link);
		}
	}
}

function saveBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	localStorage['fsm'] = JSON.stringify(createBackup());
}

function saveAsJSON() {
	var jsonData = JSON.stringify(createBackup(), null, 2);
	var blob = new Blob([jsonData], { 'type': 'application/json' });
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	link.href = url;
	link.download = 'fsm.json';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

function loadFromJSONFile(input) {
	var file = input.files[0];
	if(!file) {
		return;
	}

	var reader = new FileReader();
	reader.onload = function() {
		try {
			loadBackup(JSON.parse(reader.result));
			draw();
		} catch(e) {
			alert('Could not load this FSM JSON file.');
		}
		input.value = '';
	};
	reader.readAsText(file);
}

function selfLinkToEllipse(backup) {
	nodes = [];
	links = [];
	selectedObject = null;
	currentLink = null;
	for(var i = 0; i < backup.nodes.length; i++) {
		var backupNode = backup.nodes[i];
		var node = new Node(backupNode.x, backupNode.y);
		node.isAcceptState = backupNode.isAcceptState;
		node.text = backupNode.text;
		nodes.push(node);
	}

	for(var i = 0; i < backup.links.length; i++) {
		var backupLink = backup.links[i];
		var link = null;
		if((backupLink.type == 'SelfLink' || backupLink.type == 'SelfLinkEllipse')  && isCircle) {
			link = new SelfLink(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'SelfLink' || backupLink.type == 'SelfLinkEllipse') {
			link = new SelfLinkEllipse(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'StartLink') {
			link = new StartLink(nodes[backupLink.node]);
			link.deltaX = backupLink.deltaX;
			link.deltaY = backupLink.deltaY;
			link.text = backupLink.text;
		} else if(backupLink.type == 'Link') {
			link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
			link.parallelPart = backupLink.parallelPart;
			link.perpendicularPart = backupLink.perpendicularPart;
			link.text = backupLink.text;
			link.lineAngleAdjust = backupLink.lineAngleAdjust;
		}
		if(link != null) {
			links.push(link);
		}
	}
}

function updateBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	try {
		selfLinkToEllipse(JSON.parse(localStorage['fsm']));
	} catch(e) {
		localStorage['fsm'] = '';
	}
}