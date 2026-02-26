/*\
title: $:/core/modules/indexers/alias-indexer.js
type: application/javascript
module-type: indexer

Indexes the tiddlers by their alias field values

\*/

"use strict";

class AliasIndexer {
	constructor(wiki) {
		this.wiki = wiki;
	}

	init() {
		this.subIndexers = [
			new AliasSubIndexer(this,"each"),
			new AliasSubIndexer(this,"eachShadow"),
			new AliasSubIndexer(this,"eachTiddlerPlusShadows"),
			new AliasSubIndexer(this,"eachShadowPlusTiddlers")
		];
		for(const subIndexer of this.subIndexers) {
			subIndexer.addIndexMethod();
		}
	}

	rebuild() {
		for(const subIndexer of this.subIndexers) {
			subIndexer.rebuild();
		}
	}

	update(updateDescriptor) {
		for(const subIndexer of this.subIndexers) {
			subIndexer.update(updateDescriptor);
		}
	}
}

class AliasSubIndexer {
	constructor(indexer,iteratorMethod) {
		this.indexer = indexer;
		this.iteratorMethod = iteratorMethod;
		this.index = null; // Hashmap of alias name to array of tiddler titles, or null if not yet initialised
	}

	addIndexMethod() {
		this.indexer.wiki[this.iteratorMethod].byAlias = (aliasName) => this.lookup(aliasName).slice(0);
	}

	rebuild() {
		this.index = Object.create(null);
		this.indexer.wiki[this.iteratorMethod]((tiddler,title) => {
			if(!tiddler.fields.alias) return;
			const aliases = $tw.utils.isArray(tiddler.fields.alias)
				? tiddler.fields.alias
				: $tw.utils.parseStringArray(tiddler.fields.alias);
			if(!aliases) return;
			for(const alias of aliases) {
				if(!this.index[alias]) {
					this.index[alias] = [title];
				} else {
					this.index[alias].push(title);
				}
			}
		});
	}

	update(updateDescriptor) {
		// Invalidate the index so it will be rebuilt on next use
		this.index = null;
	}

	lookup(aliasName) {
		if(this.index === null) {
			this.rebuild();
		}
		return this.index[aliasName] || [];
	}
}

exports.AliasIndexer = AliasIndexer;
