/*\
title: $:/core/modules/indexers/alias-indexer.js
type: application/javascript
module-type: indexer

Indexes the tiddlers by their alias field values

\*/

"use strict";

function AliasIndexer(wiki) {
	this.wiki = wiki;
}

AliasIndexer.prototype.init = function() {
	this.subIndexers = [
		new AliasSubIndexer(this,"each"),
		new AliasSubIndexer(this,"eachShadow"),
		new AliasSubIndexer(this,"eachTiddlerPlusShadows"),
		new AliasSubIndexer(this,"eachShadowPlusTiddlers")
	];
	$tw.utils.each(this.subIndexers,function(subIndexer) {
		subIndexer.addIndexMethod();
	});
};

AliasIndexer.prototype.rebuild = function() {
	$tw.utils.each(this.subIndexers,function(subIndexer) {
		subIndexer.rebuild();
	});
};

AliasIndexer.prototype.update = function(updateDescriptor) {
	$tw.utils.each(this.subIndexers,function(subIndexer) {
		subIndexer.update(updateDescriptor);
	});
};

function AliasSubIndexer(indexer,iteratorMethod) {
	this.indexer = indexer;
	this.iteratorMethod = iteratorMethod;
	this.index = null; // Hashmap of alias name to array of tiddler titles, or null if not yet initialised
}

AliasSubIndexer.prototype.addIndexMethod = function() {
	var self = this;
	this.indexer.wiki[this.iteratorMethod].byAlias = function(aliasName) {
		return self.lookup(aliasName).slice(0);
	};
};

AliasSubIndexer.prototype.rebuild = function() {
	var self = this;
	// Hashmap by alias name of array of tiddler titles
	this.index = Object.create(null);
	this.indexer.wiki[this.iteratorMethod](function(tiddler,title) {
		if(tiddler.fields.alias) {
			var aliases = $tw.utils.isArray(tiddler.fields.alias) ? tiddler.fields.alias : $tw.utils.parseStringArray(tiddler.fields.alias);
			if(aliases) {
				for(var i = 0; i < aliases.length; i++) {
					if(!self.index[aliases[i]]) {
						self.index[aliases[i]] = [title];
					} else {
						self.index[aliases[i]].push(title);
					}
				}
			}
		}
	});
};

AliasSubIndexer.prototype.update = function(updateDescriptor) {
	// Invalidate the index so it will be rebuilt on next use
	this.index = null;
};

AliasSubIndexer.prototype.lookup = function(aliasName) {
	if(this.index === null) {
		this.rebuild();
	}
	return this.index[aliasName] || [];
};

exports.AliasIndexer = AliasIndexer;
