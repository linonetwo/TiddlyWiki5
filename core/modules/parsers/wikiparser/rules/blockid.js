/*\
title: $:/core/modules/parsers/wikiparser/rules/blockid.js
type: application/javascript
module-type: wikirule

Inline rule for block IDs using ^id syntax at end of line.

The ^id is parsed as a temporary "blockid" node. A post-processing step in the
wikiparser constructor absorbs it into the parent block element's "blockId" attribute.
This means the blockid node never appears in the final widget tree.

\*/

"use strict";

exports.name = "blockid";
exports.types = {inline: true};

/*
Instantiate parse rule
*/
exports.init = function(parser) {
	this.parser = parser;
	// Match ` ^id` at end of line (space before ^, non-whitespace id, at line end)
	this.matchRegExp = /[ ]\^(\S+)$/mg;
};

/*
Parse the most recent match
*/
exports.parse = function() {
	var start = this.parser.pos;
	// Move past the match
	this.parser.pos = this.matchRegExp.lastIndex;
	var id = this.match[1] || "";
	var idStart = start + 2; // skip space and ^
	var idEnd = idStart + id.length;
	// Return a temporary blockid node (will be absorbed by postProcessBlockIds)
	return [{
		type: "blockid",
		attributes: {
			id: {type: "string", value: id, start: idStart, end: idEnd}
		},
		start: start,
		end: this.parser.pos,
		children: []
	}];
};
