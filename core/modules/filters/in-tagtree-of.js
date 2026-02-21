/*\
title: $:/core/modules/filters/in-tagtree-of.js
type: application/javascript
module-type: filteroperator

Filter operator for checking if tiddlers are in a tag tree with a specified root.

By default, checks whether each input tiddler is a descendant (direct or indirect) of the
operand tag in the tag hierarchy. The optional `:inclusive` suffix also matches the root tiddler itself.
Prefixing with `!` inverts the result, returning only those tiddlers NOT in the tag tree.

\*/

"use strict";

exports["in-tagtree-of"] = function(source,operator,options) {
	const rootTiddler = operator.operand;
	// With the `:inclusive` suffix, the root tiddler itself is included in the results if it appears in the input
	const isInclusive = operator.suffix === "inclusive";
	// With the `!` prefix, output tiddlers that are NOT in the tag tree instead
	const isNotInTagTreeOf = operator.prefix === "!";
	const sourceTiddlers = new Set();
	let firstTiddler;
	
	source(function(tiddler,title) {
		sourceTiddlers.add(title);
		if(firstTiddler === undefined) {
			firstTiddler = tiddler;
		}
	});
	
	// Optimize for fileSystemPath and cascade usage, where input will only be one tiddler, and often is just tagged with the rootTiddler
	if(sourceTiddlers.size === 1 && !isNotInTagTreeOf) {
		const theOnlyTiddlerTitle = Array.from(sourceTiddlers)[0];
		if(firstTiddler && firstTiddler.fields && firstTiddler.fields.tags && firstTiddler.fields.tags.indexOf(rootTiddler) !== -1) {
			return [theOnlyTiddlerTitle];
		}
		if(isInclusive && theOnlyTiddlerTitle === rootTiddler) {
			return [theOnlyTiddlerTitle];
		}
	}
	
	const rootTiddlerChildren = options.wiki.getGlobalCache("in-tagtree-of-" + rootTiddler,function() {
		return $tw.utils.getTagDescendants(options.wiki,rootTiddler);
	});
	
	if(isNotInTagTreeOf) {
		const outsideTree = Array.from(sourceTiddlers).filter(function(title) {
			const isInTree = rootTiddlerChildren.has(title) || (isInclusive && title === rootTiddler);
			return !isInTree;
		});
		return outsideTree;
	}

	const insideTree = Array.from(sourceTiddlers).filter(function(title) {
		return rootTiddlerChildren.has(title) || (isInclusive && title === rootTiddler);
	});
	return insideTree;
};
