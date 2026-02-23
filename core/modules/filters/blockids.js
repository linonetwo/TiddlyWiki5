/*\
title: $:/core/modules/filters/blockids.js
type: application/javascript
module-type: filteroperator

Filter operator for returning block IDs that the input tiddler links to in the specified target tiddler.

Usage: [<sourceTiddler>blockids[TargetTitle]]

Returns block IDs (not tiddler titles) that <sourceTiddler> uses when linking to TargetTitle.

\*/

"use strict";

/*
Export our filter function
*/
exports.blockids = function(source,operator,options) {
	var results = [];
	source(function(tiddler,title) {
		var marks = options.wiki.getTiddlerBlockIdLinks(title,operator.operand);
		$tw.utils.each(marks,function(mark) {
			$tw.utils.pushTop(results,mark);
		});
	});
	return results;
};
