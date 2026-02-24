/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/anchorblock.js
type: application/javascript
module-type: wikiruleserializer

Serializer for block-level anchors (^id on its own line before a block).
\*/

"use strict";

exports.name = "anchorblock";

exports.serialize = function(tree,serialize) {
	var anchorId = tree.attributes && tree.attributes.id ? tree.attributes.id.value : "";
	if(!tree.children || tree.children.length === 0) {
		return "";
	}
	var childText = serialize(tree.children[0]);
	if(anchorId) {
		return "^" + anchorId + "\n" + childText;
	}
	return childText;
};
