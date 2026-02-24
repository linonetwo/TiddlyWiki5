/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/typedblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "typedblock";

exports.serialize = function (tree,serialize) {
	if(tree.type === "void") {
		var anchor = tree._anchorId ? " ^" + tree._anchorId : "";
		return "$$$" + tree.parseType + (tree.renderType ? " > " + tree.renderType : "") + anchor + "\n" + tree.text + "\n$$$\n\n";
	}
	return "";
};
