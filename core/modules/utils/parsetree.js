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
Recursively search for a parse tree node with a matching block ID attribute.
Returns the matching node or null.
*/
exports.findNodeWithBlockId = function(tree,blockId) {
	for(var i = 0; i < tree.length; i++) {
		var node = tree[i];
		if(node.attributes && node.attributes.blockId && node.attributes.blockId.value === blockId) {
			return node;
		}
		if(node.children) {
			var found = exports.findNodeWithBlockId(node.children,blockId);
			if(found) {
				return found;
			}
		}
	}
	return null;
};

/*
Extract a single block (or range of blocks) from a parse tree by block ID(s).
If blockIdEnd is provided, extracts all top-level nodes from blockId to blockIdEnd (inclusive).
Returns an array of parse tree nodes, or null if block ID not found.
*/
exports.extractBlockIdNodes = function(tree,blockId,blockIdEnd) {
	if(!blockIdEnd) {
		// Single block extraction
		var node = exports.findNodeWithBlockId(tree,blockId);
		if(node) {
			return [node];
		}
		return null;
	}
	// Range extraction: find both block IDs in the flat top-level list
	// First, try to find both block IDs at the same level of nesting
	var result = exports.extractBlockIdRange(tree,blockId,blockIdEnd);
	if(result) {
		return result;
	}
	return null;
};

/*
Extract a range of nodes between two block IDs at the same level of a tree.
Returns the matching nodes array, or null if not found at this level.
Searches recursively into children if not found at the current level.
*/
exports.extractBlockIdRange = function(tree,blockIdStart,blockIdEnd) {
	var startIndex = -1, endIndex = -1;
	// Search at this level
	for(var i = 0; i < tree.length; i++) {
		var node = tree[i];
		if(node.attributes && node.attributes.blockId) {
			if(node.attributes.blockId.value === blockIdStart) {
				startIndex = i;
			}
			if(node.attributes.blockId.value === blockIdEnd) {
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
			var found = exports.extractBlockIdRange(tree[j].children,blockIdStart,blockIdEnd);
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
