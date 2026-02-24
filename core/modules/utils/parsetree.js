/*\
title: $:/core/modules/utils/parsetree.js
type: application/javascript
module-type: utils

Parse tree utility functions.

\*/

"use strict";

/*
Add attribute to parse tree node
Can be invoked as (node,name,value) or (node,attr)
*/
exports.addAttributeToParseTreeNode = function(node,name,value) {
	var attribute = typeof name === "object" ? name : {name: name, type: "string", value: value};
	name = attribute.name;
	node.attributes = node.attributes || {};
	node.orderedAttributes = node.orderedAttributes || [];
	node.attributes[name] = attribute;
	var foundIndex = -1;
	$tw.utils.each(node.orderedAttributes,function(attr,index) {
		if(attr.name === name) {
			foundIndex = index;
		}
	});
	if(foundIndex === -1) {
		node.orderedAttributes.push(attribute);
	} else {
		node.orderedAttributes[foundIndex] = attribute;
	}
};

exports.getOrderedAttributesFromParseTreeNode = function(node) {
	if(node.orderedAttributes) {
		return node.orderedAttributes;
	} else {
		var attributes = [];
		$tw.utils.each(node.attributes,function(attribute) {
			attributes.push(attribute);
		});
		return attributes.sort(function(a,b) {
			return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
		});
	}
};

exports.getAttributeValueFromParseTreeNode = function(node,name,defaultValue) {
	if(node.attributes && node.attributes[name] && node.attributes[name].value !== undefined) {
		return node.attributes[name].value;
	}
	return defaultValue;
};

exports.addClassToParseTreeNode = function(node,classString) {
	var classes = [],
		attribute;
	node.attributes = node.attributes || {};
	attribute = node.attributes["class"];
	if(!attribute) {
		// If the class attribute does not exist, we must create it first.
		attribute = {name: "class", type: "string", value: ""};
		node.attributes["class"] = attribute;
		node.orderedAttributes = node.orderedAttributes || [];
		node.orderedAttributes.push(attribute);
	}
	if(attribute.type === "string") {
		if(attribute.value !== "") {
			classes = attribute.value.split(" ");
		}
		if(classString !== "") {
			$tw.utils.pushTop(classes,classString.split(" "));
		}
		attribute.value = classes.join(" ");
	}
};

exports.addStyleToParseTreeNode = function(node,name,value) {
	var attribute;
	node.attributes = node.attributes || {};
	attribute = node.attributes.style;
	if(!attribute) {
		attribute = {name: "style", type: "string", value: ""};
		node.attributes.style = attribute;
		node.orderedAttributes = node.orderedAttributes || [];
		node.orderedAttributes.push(attribute);
	}
	if(attribute.type === "string") {
		attribute.value += name + ":" + value + ";";
	}
};

exports.findParseTreeNode = function(nodeArray,search) {
	for(var t=0; t<nodeArray.length; t++) {
		if(nodeArray[t].type === search.type && nodeArray[t].tag === search.tag) {
			return nodeArray[t];
		}
	}
	return undefined;
};

/*
Scan inline parse-tree nodes for a trailing " ^id" anchor syntax.
If found, trims the anchor text from the last text node and returns the
anchor id string. Returns null if no anchor is found.
Modifies the nodes array in-place.

Used by parseBlock (paragraphs + headings) and list.js (list items) so that
anchor detection requires no inline rule and produces no temporary node types.
*/
exports.extractInlineAnchor = function extractInlineAnchor(nodes) {
	if(!nodes || nodes.length === 0) return null;
	for(var i = nodes.length - 1; i >= 0; i--) {
		var node = nodes[i];
		if(node.type === "text") {
			if(!node.text) return null; // guard against empty/undefined text
			var m = node.text.match(/^(.*?)[ \t]\^(\S+)[ \t]*$/);
			if(m) {
				node.text = m[1];
				if(!node.text) nodes.splice(i, 1);
				return m[2]; // anchor id
			}
			return null; // last text node has no anchor
		}
		if(node.children && node.children.length > 0) {
			var id = extractInlineAnchor(node.children);
			if(id !== null) return id;
			return null;
		}
	}
	return null;
};

/*
Recursively search for an anchor container node with a matching id attribute.
Returns the matching anchor node or null.
*/
exports.findNodeWithAnchor = function(tree,anchor) {
	for(var i = 0; i < tree.length; i++) {
		var node = tree[i];
		if(node.type === "anchor" && node.attributes && node.attributes.id && node.attributes.id.value === anchor) {
			return node;
		}
		if(node.children) {
			var found = exports.findNodeWithAnchor(node.children,anchor);
			if(found) {
				return found;
			}
		}
	}
	return null;
};

/*
Extract a single anchor container (or range of anchor containers) from a parse tree.
If anchorEnd is provided, extracts all top-level nodes from anchor to anchorEnd (inclusive).
Returns an array of parse tree nodes, or null if anchor not found.
*/
exports.extractAnchorNodes = function(tree,anchor,anchorEnd) {
	if(!anchorEnd) {
		// Single anchor extraction
		var node = exports.findNodeWithAnchor(tree,anchor);
		if(node) {
			return [node];
		}
		return null;
	}
	// Range extraction: find both anchors in the flat top-level list
	// First, try to find both anchors at the same level of nesting
	var result = exports.extractAnchorRange(tree,anchor,anchorEnd);
	if(result) {
		return result;
	}
	return null;
};

/*
Extract a range of nodes between two anchor containers at the same level of a tree.
Returns the matching nodes array, or null if not found at this level.
Searches recursively into children if not found at the current level.
*/
exports.extractAnchorRange = function(tree,anchorStart,anchorEnd) {
	var startIndex = -1, endIndex = -1;
	// Search at this level
	for(var i = 0; i < tree.length; i++) {
		var node = tree[i];
		if(node.type === "anchor" && node.attributes && node.attributes.id) {
			if(node.attributes.id.value === anchorStart) {
				startIndex = i;
			}
			if(node.attributes.id.value === anchorEnd) {
				endIndex = i;
			}
		}
	}
	// Both found at this level
	if(startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
		return tree.slice(startIndex,endIndex + 1);
	}
	// Not found at this level - search in children
	for(var j = 0; j < tree.length; j++) {
		if(tree[j].children) {
			var found = exports.extractAnchorRange(tree[j].children,anchorStart,anchorEnd);
			if(found) {
				return found;
			}
		}
	}
	return null;
};

/*
Helper to get the text of a parse tree node or array of nodes
*/
exports.getParseTreeText = function getParseTreeText(tree) {
	var output = [];
	if($tw.utils.isArray(tree)) {
		$tw.utils.each(tree,function(node) {
			output.push(getParseTreeText(node));
		});
	} else {
		if(tree.type === "text") {
			output.push(tree.text);
		}
		if(tree.children) {
			return getParseTreeText(tree.children);
		}
	}
	return output.join("");
};

exports.getParser = function(type,options) {
	options = options || {};
	// Select a parser
	var Parser = $tw.Wiki.parsers[type];
	if(!Parser && $tw.utils.getFileExtensionInfo(type)) {
		Parser = $tw.Wiki.parsers[$tw.utils.getFileExtensionInfo(type).type];
	}
	if(!Parser) {
		Parser = $tw.Wiki.parsers[options.defaultType || "text/vnd.tiddlywiki"];
	}
	if(!Parser) {
		return null;
	}
	return Parser;
};
