/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/anchor.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "anchor";

exports.serialize = function(tree,serialize) {
	var anchorId = tree.attributes && tree.attributes.id ? tree.attributes.id.value : "";
	if(!tree.children || tree.children.length === 0) {
		return "";
	}
	var child = tree.children[0];
	// For nodes that declare anchorStyle:"opening", the child's own serializer
	// handles placing ^id on its opening delimiter line via child._anchorId.
	// (wrapAnchors has already set child._anchorId = anchorId for these nodes.)
	if(child.anchorStyle === "opening") {
		return serialize(child);
	}
	// Default: insert ^id before the trailing newlines.
	// Works uniformly for paragraphs, headings, list items, transclusions, etc.
	var childText = serialize(child);
	if(anchorId) {
		var match = childText.match(/(\n+)$/);
		var trailing = match ? match[0] : "\n\n";
		var trimmed = match ? childText.slice(0,-trailing.length) : childText;
		return trimmed + " ^" + anchorId + trailing;
	}
	return childText;
};
