/*\
title: $:/core/modules/parsers/wikiparser/rules/anchorblock.js
type: application/javascript
module-type: wikirule

Block rule for anchors. Recognises `^id` on its own line and wraps the
immediately following block in an anchor container node.

This is a HIGH PRIORITY block rule: it fires before other block rules so
that the subsequent block becomes a child of the anchor node, achieving a
single-pass wrap with zero invasion of any other rule.

\*/

"use strict";

exports.name = "anchorblock";
exports.types = {block: true};

exports.init = function(parser) {
	this.parser = parser;
	// Match ^id on its own line (only horizontal whitespace allowed after id)
	this.matchRegExp = /^\^(\S+)[ \t]*\r?\n/mg;
};

exports.parse = function() {
	// Save match details before calling parseBlock(), which may overwrite
	// this.match via findNextMatch() on all block rules including this one.
	var anchorId = this.match[1];
	var matchStart = this.match.index;
	// Move past the ^id line
	this.parser.pos = this.matchRegExp.lastIndex;
	// Parse the next block as this anchor's child
	var block = this.parser.parseBlock();
	if(block.length === 0) {
		return [];
	}
	return [{
		type: "anchor",
		attributes: {
			id: {type: "string", value: anchorId}
		},
		children: block,
		start: matchStart,
		end: this.parser.pos,
		isBlock: true
	}];
};
