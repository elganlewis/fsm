function intersectionX(a,b,e,r) {
	return (b**2 * e - a * Math.sqrt(b**2 * (b**2 - a**2 + e**2 - r**2) + a**2 * r**2))/(b**2 - a**2);
}

function SelfLinkEllipse(node, mouse) {
	this.node = node;
	this.anchorAngle = 0;
	this.mouseOffsetAngle = 0;
	this.text = '';

	if(mouse) {
		this.setAnchorPoint(mouse.x, mouse.y);
	}
}

SelfLinkEllipse.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
};

SelfLinkEllipse.prototype.setAnchorPoint = function(x, y) {
	this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
	// snap to 90 degrees
	var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
	if(Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
	// keep in the range -pi to pi so our containsPoint() function always works
	if(this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
	if(this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

SelfLinkEllipse.prototype.getEndPointsAndEllipse = function() {
	var ellipseRadius = selfLinkRadiusScale * nodeRadius;
	var a = ellipseRadius * 1.35;
	var b = ellipseRadius * 0.55;
	var ellipseCenterDist = nodeRadius;
	var X = intersectionX(a,b,ellipseCenterDist,nodeRadius);
	var Y = Math.sqrt(nodeRadius**2 - X**2);

    var ellipseCenterX = this.node.x + ellipseCenterDist * Math.cos(this.anchorAngle);
	var ellipseCenterY = this.node.y + ellipseCenterDist * Math.sin(this.anchorAngle);
	var t = Math.acos((X-ellipseCenterDist)/a)
	var beta = arrowSide*Math.atan(Y/X) + this.anchorAngle;
	var endX = this.node.x + X * Math.cos(beta)-Y*Math.sin(beta);
	var endY = this.node.y + X * Math.sin(beta) + Y * Math.cos(beta);
	return {
		'hasCircle': true,
		'endX': endX,
		'endY': endY,
		't': t,
		'ellipseCenterX': ellipseCenterX,
		'ellipseCenterY': ellipseCenterY,
		'ellipseRadius': ellipseRadius,
		'a': a,
		'b': b,
		'beta': beta
	};
};

SelfLinkEllipse.prototype.draw = function(c) {
	var stuff = this.getEndPointsAndEllipse();
	// draw arc
	c.beginPath();
	c.ellipse(
        stuff.ellipseCenterX,
        stuff.ellipseCenterY,
        stuff.a,
        stuff.b,
        this.anchorAngle,
        -stuff.t,
        stuff.t,
		false
    );
	c.stroke();
	// draw the text on the loop farthest from the node
	var textX = stuff.ellipseCenterX + (stuff.a - 3) * Math.cos(this.anchorAngle);
	var textY = stuff.ellipseCenterY + (stuff.a - 3) * Math.sin(this.anchorAngle);
	drawText(c, this.text, textX, textY, this.anchorAngle, selectedObject == this);
	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, this.anchorAngle + Math.PI);
};

SelfLinkEllipse.prototype.containsPoint = function(x, y) {
	var stuff = this.getEndPointsAndEllipse();
	var dx = x - stuff.ellipseCenterX;
	var dy = y - stuff.ellipseCenterY;
	var distance = Math.sqrt(dx*dx + dy*dy) - stuff.ellipseRadius;
	return (Math.abs(distance) < hitTargetPadding);
};
