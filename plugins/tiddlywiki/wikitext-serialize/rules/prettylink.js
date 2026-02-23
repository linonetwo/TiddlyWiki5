/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/prettylink.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "prettylink";

exports.serialize = function(tree,serialize) {
	var text = tree.children[0].text;
	var target = tree.attributes.to ? tree.attributes.to.value : tree.attributes.href.value;
	var blockId = tree.attributes.blockId ? tree.attributes.blockId.value : "";
	
	// Build the target with block ID if present
	var targetWithMark = target + (blockId ? "^" + blockId : "");
	
	// If text equals target (without block ID), we don't need the alias syntax
	if(text === target) {
		return "[[" + targetWithMark + "]]";
	} else {
		return "[[" + text + "|" + targetWithMark + "]]";
	}
};
