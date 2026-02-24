/*\
title: $:/core/modules/parsers/wikiparser/rules/anchor.js
type: application/javascript
module-type: wikirule

Inline rule for anchors using ^id syntax at end of line.

The ^id is parsed as a temporary "anchor" marker node. The wikiparser's parseBlock()
method detects this marker and wraps the enclosing block in an <$anchor> container widget.
The anchor marker itself is removed from the block's children.

\*/

"use strict";

exports.name = "anchor";
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
	// Return a temporary anchor-marker node (will be wrapped by wrapAnchors in parseBlock)
	return [{
		type: "anchor-marker",
		attributes: {
			id: {type: "string", value: id, start: idStart, end: idEnd}
		},
		start: start,
		end: this.parser.pos,
		children: []
	}];
};
