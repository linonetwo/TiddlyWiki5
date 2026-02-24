/*\
title: $:/core/modules/parsers/wikiparser/rules/codeblock.js
type: application/javascript
module-type: wikirule

Wiki text rule for code blocks. For example:

```
	```
	This text will not be //wikified//
	```
```

\*/

"use strict";

exports.name = "codeblock";
exports.types = {block: true};

exports.init = function(parser) {
	this.parser = parser;
	// Regexp to match language and optional ^anchor on the opening fence line
	this.matchRegExp = /```([\w-]*)(?:\s+\^(\S+))?\r?\n/mg;
};

exports.parse = function() {
	var reEnd = /(\r?\n```$)/mg;
	var languageStart = this.parser.pos + 3,
		languageEnd = languageStart + this.match[1].length;
	var anchor = this.match[2] || "";
	// Move past the match
	this.parser.pos = this.matchRegExp.lastIndex;

	// Look for the end of the block
	reEnd.lastIndex = this.parser.pos;
	var match = reEnd.exec(this.parser.source),
		text,
		codeStart = this.parser.pos;
	// Process the block
	if(match) {
		text = this.parser.source.substring(this.parser.pos,match.index);
		this.parser.pos = match.index + match[0].length;
	} else {
		text = this.parser.source.substr(this.parser.pos);
		this.parser.pos = this.parser.sourceLength;
	}
	// Return the $codeblock widget
	// anchorStyle:"opening" tells wrapAnchors/serializer that ^id appears on the
	// opening fence line, not appended after the closing fence.
	var result = [{
		type: "codeblock",
		attributes: {
			code: {type: "string", value: text, start: codeStart, end: this.parser.pos},
			language: {type: "string", value: this.match[1], start: languageStart, end: languageEnd}
		},
		anchorStyle: "opening"
	}];
	if(anchor) {
		result[0].anchorId = anchor;
	}
	return result;
};
