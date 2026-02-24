/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/quoteblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "quoteblock";

exports.serialize = function (tree,serialize) {
	var result = [];
	if(tree.type === "element" && tree.tag === "blockquote") {
		// Exclude built-in tc-quote class; only emit user-defined classes
		var userClasses = (tree.attributes.class ? tree.attributes.class.value : "").split(" ").filter(function(c) {
			return c && c !== "tc-quote";
		});
		var classStr = userClasses.length > 0 ? userClasses.map(function(c) { return "." + c; }).join("") : "";
		result.push("<<<" + classStr);
		tree.children.forEach(function (child) {
			if(child.type === "element" && child.tag === "p") {
				result.push(serialize(child.children).trim());
			}
		});
		result.push("<<<");
	}
	return result.join("\n") + "\n\n";
};
