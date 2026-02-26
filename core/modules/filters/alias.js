/*\
title: $:/core/modules/filters/alias.js
type: application/javascript
module-type: filteroperator

Filter operator for looking up tiddlers by their alias field.

Usage:
  [alias[<alias-name>]] - returns all tiddlers that declare <alias-name> in their alias field
                          (using AliasIndexer for efficient multi-value lookup)

This differs from [field:alias[<value>]] which does an exact string match on the raw alias
field value and will not correctly handle multi-value alias fields.

\*/

"use strict";

/*
Export our filter function
*/
exports.alias = function(source,operator,options) {
	const aliasName = operator.operand;
	if(operator.prefix === "!") {
		// Negated: return source tiddlers that do NOT have this alias
		const results = [];
		source((tiddler,title) => {
			const aliases = tiddler && tiddler.fields.alias
				? ($tw.utils.isArray(tiddler.fields.alias) ? tiddler.fields.alias : $tw.utils.parseStringArray(tiddler.fields.alias))
				: [];
			if(!aliases || aliases.indexOf(aliasName) === -1) {
				results.push(title);
			}
		});
		return results;
	} else if(aliasName) {
		// Use the AliasIndexer byAlias method when available (includes tiddlers and shadows)
		if(options.wiki.eachTiddlerPlusShadows.byAlias) {
			return options.wiki.eachTiddlerPlusShadows.byAlias(aliasName);
		}
		// Fallback: scan all tiddlers manually
		const results = [];
		options.wiki.eachTiddlerPlusShadows((tiddler,title) => {
			if(tiddler && tiddler.fields.alias) {
				const aliases = $tw.utils.isArray(tiddler.fields.alias)
					? tiddler.fields.alias
					: $tw.utils.parseStringArray(tiddler.fields.alias);
				if(aliases && aliases.indexOf(aliasName) !== -1) {
					results.push(title);
				}
			}
		});
		return results;
	}
	return [];
};
