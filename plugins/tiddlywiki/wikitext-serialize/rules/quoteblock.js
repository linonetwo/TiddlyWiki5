/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/quoteblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "quoteblock";

exports.serialize = function (tree,serialize) {
	if(!(tree.type === "element" && tree.tag === "blockquote")) {
		return "";
	}
	// Exclude built-in "tc-quote" class from serialized output; only emit user-defined classes
	var userClasses = tree.attributes.class.value.split(" ").filter(function(c) {
		return c && c !== "tc-quote";
	});
	var classStr = userClasses.length > 0 ? " " + userClasses.map(function(c) { return "." + c; }).join("") : "";
	var anchorStr = tree._anchorId ? " ^" + tree._anchorId : "";
	var lines = ["<<<" + classStr + anchorStr];
	tree.children.forEach(function(child) {
		// Unwrap anchor containers around body paragraphs
		var unwrapped = $tw.utils.unwrapAnchor(child);
		var suffix = unwrapped.anchorId ? " ^" + unwrapped.anchorId : "";
		var inner = unwrapped.inner;
		if(inner.type === "element" && inner.tag === "p") {
			lines.push(serialize(inner.children).trim() + suffix);
		}
		// cite elements (opening/closing attribution) are not yet serialized
	});
	lines.push("<<<");
	return lines.join("\n") + "\n\n";
};
