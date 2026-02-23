/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/codeblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "codeblock";

exports.serialize = function(tree,serialize) {
	var anchor = tree.attributes.blockId ? tree.attributes.blockId.value : "";
	var language = tree.attributes.language.value;
	var blockIdSuffix = anchor ? " ^" + anchor : "";
	return "```" + language + blockIdSuffix + "\n" + tree.attributes.code.value + "\n```\n\n";
};
