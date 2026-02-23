/*\
title: $:/plugins/tiddlywiki/wikitext-serialize/rules/transcludeblock.js
type: application/javascript
module-type: wikiruleserializer
\*/

"use strict";

exports.name = "transcludeblock";

exports.serialize = function(tree,serialize) {
	var result = "{{";
	function handleTransclude(transcludeNode) {
		// Handle field
		if(transcludeNode.attributes.$field) {
			result += "!!" + transcludeNode.attributes.$field.value;
		}
		// Check for index attribute
		if(transcludeNode.attributes.$index) {
			result += "##" + transcludeNode.attributes.$index.value;
		}
		// Check for block ID attribute (single or range)
		if(transcludeNode.attributes.$blockId) {
			result += "^" + transcludeNode.attributes.$blockId.value;
			if(transcludeNode.attributes.$blockIdEnd) {
				result += "..^" + transcludeNode.attributes.$blockIdEnd.value;
			}
		}
		// Handle template
		var tiddlerTitle = tree.attributes.tiddler ? tree.attributes.tiddler.value : undefined;
		if(transcludeNode.attributes.$tiddler && transcludeNode.attributes.$tiddler.value !== tiddlerTitle) {
			result += "||" + transcludeNode.attributes.$tiddler.value;
		}
		// Check for parameters
		var params = [];
		var excludedAttributes = ["tiddler", "$tiddler", "$field", "$index", "$blockId", "$blockIdEnd", "$template"];
		for(var key in transcludeNode.attributes) {
			if(excludedAttributes.indexOf(key) === -1) {
				params.push(transcludeNode.attributes[key].value);
			}
		}
		if(params.length > 0) {
			result += "|" + params.join("|");
		}
	}
	function handleTiddler(tiddlerNode) {
		// Check for tiddler attribute
		if(tree.attributes.tiddler.value) { 
			result += tree.attributes.tiddler.value;
		}
		$tw.utils.each(tree.children, function(child) {
			if(child.type === "transclude") {
				handleTransclude(child);
			}
		});
	}
	if(tree.type === "tiddler") {
		handleTiddler(tree);
	} else if(tree.type === "transclude") {
		handleTransclude(tree);
	}
	result += "}}\n\n";
	return result;
};
