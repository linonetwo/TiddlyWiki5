/*\
title: $:/core/modules/widgets/anchor.js
type: application/javascript
module-type: widget

Anchor widget — a transparent container that marks its first child DOM node
as an anchor target for navigation and transclusion.

Renders no DOM element of its own; instead it applies data-tw-anchor, id,
and tabindex attributes to the first DOM node rendered by its children.

\*/

"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var AnchorWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
AnchorWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
AnchorWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent,nextSibling);
	this.applyAnchorAttributes();
};

/*
Compute the internal state of the widget
*/
AnchorWidget.prototype.execute = function() {
	this.anchorId = this.getAttribute("id","");
	this.makeChildWidgets();
};

/*
Apply anchor-related DOM attributes to the first child DOM node.
Sets data-tw-anchor (bare id), id (qualified with tiddler title), and tabindex.
*/
AnchorWidget.prototype.applyAnchorAttributes = function() {
	if(!this.anchorId) {
		return;
	}
	var domNode = this.findFirstDomNode();
	if(domNode && domNode.nodeType === 1) {
		var tiddlerTitle = this.getVariable("currentTiddler","");
		var qualifiedId = tiddlerTitle ? (tiddlerTitle + "^^" + this.anchorId) : this.anchorId;
		domNode.setAttribute("data-tw-anchor",this.anchorId);
		domNode.setAttribute("id",qualifiedId);
		if(!domNode.getAttribute("tabindex")) {
			domNode.setAttribute("tabindex","-1");
		}
	}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
AnchorWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.id) {
		this.refreshSelf();
		return true;
	}
	var result = this.refreshChildren(changedTiddlers);
	// Re-apply after children refresh in case DOM nodes changed
	this.applyAnchorAttributes();
	return result;
};

exports.anchor = AnchorWidget;
