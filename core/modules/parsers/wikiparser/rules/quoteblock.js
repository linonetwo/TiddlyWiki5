/*\
title: $:/core/modules/parsers/wikiparser/rules/quoteblock.js
type: application/javascript
module-type: wikirule

Wiki text rule for quote blocks.

\*/

"use strict";

exports.name = "quoteblock";
exports.types = {block: true};

exports.init = function(parser) {
	this.parser = parser;
	// Regexp to match
	this.matchRegExp = /(<<<+)/mg;
};

exports.parse = function() {
	var classes = ["tc-quote"];
	// Get all the details of the match
	var reEndString = "^\\s*" + this.match[1] + "(?!<)";
	// Move past the <s
	this.parser.pos = this.matchRegExp.lastIndex;
	// Parse any classes, whitespace and then the optional cite itself
	var classStart = this.parser.pos;
	classes.push.apply(classes, this.parser.parseClasses());
	var classEnd = this.parser.pos;
	// Do NOT skip whitespace before parsing the opening cite inline run.
	// The anchor inline rule matches " ^id" (with a preceding space), so the
	// space between <<< and ^id must be preserved for the rule to fire.
	var citeStart = this.parser.pos;
	var cite = this.parser.parseInlineRun(/(\r?\n)/mg);
	var citeEnd = this.parser.pos;
	// Trim leading whitespace text node that would otherwise appear in the cite
	// (replaces the skipWhitespace that was called here before).
	if(cite.length > 0 && cite[0].type === "text") {
		cite[0].text = cite[0].text.replace(/^\s+/,"");
		if(!cite[0].text) cite.shift();
	}
	// Extract anchor from end of opening cite if present.
	// This allows: <<<  ^quoteId  or  <<< Some citation text ^quoteId
	var anchorId = null;
	if(cite.length > 0 && cite[cite.length - 1].type === "anchor-marker" &&
			cite[cite.length - 1].attributes && cite[cite.length - 1].attributes.id) {
		anchorId = cite.pop().attributes.id.value;
	}
	// before handling the cite, parse the body of the quote
	var tree = this.parser.parseBlocks(reEndString);
	// If we got a cite, put it before the text
	if(cite.length > 0) {
		tree.unshift({
			type: "element",
			tag: "cite",
			children: cite,
			start: citeStart,
			end: citeEnd
		});
	}
	// Parse any optional cite
	this.parser.skipWhitespace({treatNewlinesAsNonWhitespace: true});
	citeStart = this.parser.pos;
	cite = this.parser.parseInlineRun(/(\r?\n)/mg);
	citeEnd = this.parser.pos;
	// If we got a cite, push it
	if(cite.length > 0) {
		tree.push({
			type: "element",
			tag: "cite",
			children: cite,
			start: citeStart,
			end: citeEnd
		});
	}
	// Return the blockquote element.
	// anchorStyle:"opening" declares that ^id appears on the <<< opening line.
	var result = [{
		type: "element",
		tag: "blockquote",
		attributes: {
			class: { type: "string", value: classes.join(" "), start: classStart, end: classEnd },
		},
		children: tree,
		anchorStyle: "opening"
	}];
	if(anchorId) {
		result[0].anchorId = anchorId;
	}
	return result;
};
