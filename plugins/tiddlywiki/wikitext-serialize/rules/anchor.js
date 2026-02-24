/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/anchor.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "anchor";

/*
Generic anchor serializer for inline-originated anchors (paragraph, heading,
list items, etc.). Inserts " ^id" before the trailing newlines of the child
block's serialized text.

Note: this serializer is NOT called for anchors that wrap list items inside a
<ul>/<ol> — the list serializer handles those directly via unwrapAnchor.
*/
exports.serialize = function(tree,serialize) {
	var anchorId = tree.attributes && tree.attributes.id ? tree.attributes.id.value : "";
	if(!tree.children || tree.children.length === 0) {
		return "";
	}
	var childText = serialize(tree.children[0]);
	if(anchorId) {
		var match = childText.match(/(\n+)$/);
		var trailing = match ? match[0] : "\n\n";
		var trimmed = match ? childText.slice(0,-trailing.length) : childText;
		return trimmed + " ^" + anchorId + trailing;
	}
	return childText;
};
