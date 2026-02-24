/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/codeblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "codeblock";

exports.serialize = function(tree,serialize) {
	var language = tree.attributes.language.value;
	var anchor = tree._anchorId ? " ^" + tree._anchorId : "";
	return "```" + language + anchor + "\n" + tree.attributes.code.value + "\n```\n\n";
};
