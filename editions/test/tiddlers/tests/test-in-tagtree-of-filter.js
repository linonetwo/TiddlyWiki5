/*\
title: test-in-tagtree-of-filter.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the in-tagtree-of filter operator.

\*/

"use strict";

describe("in-tagtree-of filter operator tests", function() {

	describe("With tiddlers in the store unsorted",function() {
		testWithAndWithoutIndexers();
	});
	describe("With tiddlers in the store sorted ascending",function() {
		testWithAndWithoutIndexers({sort: "ascending"});
	});
	describe("With tiddlers in the store sorted descending",function() {
		testWithAndWithoutIndexers({sort: "descending"});
	});

	function testWithAndWithoutIndexers(options) {
		describe("With no indexers", function() {
			var wiki = setupWiki(Object.assign({},options,{enableIndexers: []}));
			runTests(wiki);
		});

		describe("With all indexers", function() {
			var wiki = setupWiki(options);
			runTests(wiki);
		});
	}

	function setupWiki(wikiOptions) {
		wikiOptions = wikiOptions || {};
		// Create a wiki
		var wiki = new $tw.Wiki(wikiOptions);
		// Add a plugin containing some shadow tiddlers
		var shadowTiddlers = {
			tiddlers: {
				"$:/TiddlerFive": {
					title: "$:/TiddlerFive",
					tags: ["two"]
				},
				"TiddlerSeventh": {
					title: "TiddlerSeventh",
					tags: ["one"]
				},
				"Tiddler8": {
					title: "Tiddler8",
					tags: ["one"]
				}
			}
		};
		var tiddlers = [{
			title: "$:/ShadowPlugin",
			text: JSON.stringify(shadowTiddlers),
			"plugin-type": "plugin",
			type: "application/json"
		},{
			title: "TiddlerOne",
			tags: ["one"]
		},{
			// ChildOfTiddlerOne is tagged with TiddlerOne (not directly with "one"),
			// making it an indirect (level-2) descendant of "one"
			title: "ChildOfTiddlerOne",
			tags: ["TiddlerOne"]
		},{
			title: "$:/TiddlerTwo",
			tags: ["two"]
		},{
			title: "Tiddler Three",
			tags: ["one","two"]
		},{
			title: "a fourth tiddler",
			tags: []
		},{
			title: "one"
		}];
		// Load the tiddlers in the required order
		var fnCompare;
		switch(wikiOptions.sort) {
			case "ascending":
				fnCompare = function(a,b) {
					if(a.title < b.title) {
						return -1;
					} else if(a.title > b.title) {
						return +1;
					} else {
						return 0;
					}
				};
				break;
			case "descending":
				fnCompare = function(a,b) {
					if(a.title < b.title) {
						return +1;
					} else if(a.title > b.title) {
						return -1;
					} else {
						return 0;
					}
				};
				break;
		}
		if(fnCompare) {
			tiddlers.sort(fnCompare);
		}
		wiki.addTiddlers(tiddlers);
		// Unpack plugin tiddlers
		wiki.readPluginInfo();
		wiki.registerPluginTiddlers("plugin");
		wiki.unpackPluginTiddlers();
		wiki.addIndexersToWiki();
		return wiki;
	}

	function runTests(wiki) {
		it("should handle basic in-tagtree-of checks", function() {
			// "one" is a tag with children: "Tiddler Three", "TiddlerOne", "Tiddler8", "TiddlerSeventh"
			expect(wiki.filterTiddlers("[[TiddlerOne]in-tagtree-of[one]]").join(",")).toBe("TiddlerOne");
			expect(wiki.filterTiddlers("[[Tiddler Three]in-tagtree-of[one]]").join(",")).toBe("Tiddler Three");
			expect(wiki.filterTiddlers("[[Tiddler8]in-tagtree-of[one]]").join(",")).toBe("Tiddler8");
			expect(wiki.filterTiddlers("[[TiddlerSeventh]in-tagtree-of[one]]").join(",")).toBe("TiddlerSeventh");
		});

		it("should return empty for tiddlers not in the tag tree", function() {
			expect(wiki.filterTiddlers("[[$:/TiddlerTwo]in-tagtree-of[one]]").join(",")).toBe("");
			expect(wiki.filterTiddlers("[[a fourth tiddler]in-tagtree-of[one]]").join(",")).toBe("");
		});

		it("should handle multiple tiddlers at once", function() {
			expect(wiki.filterTiddlers("[[TiddlerOne]] [[Tiddler8]] [[$:/TiddlerTwo]] +[in-tagtree-of[one]sort[title]]").join(",")).toBe("Tiddler8,TiddlerOne");
		});

		it("should work with different root tags", function() {
			// "two" has children: "$:/TiddlerFive", "$:/TiddlerTwo", "Tiddler Three"
			expect(wiki.filterTiddlers("[[$:/TiddlerTwo]in-tagtree-of[two]]").join(",")).toBe("$:/TiddlerTwo");
			expect(wiki.filterTiddlers("[[Tiddler Three]in-tagtree-of[two]]").join(",")).toBe("Tiddler Three");
		});

		it("should handle negation with ! prefix", function() {
			expect(wiki.filterTiddlers("[[TiddlerOne]!in-tagtree-of[one]]").join(",")).toBe("");
			expect(wiki.filterTiddlers("[[$:/TiddlerTwo]!in-tagtree-of[one]]").join(",")).toBe("$:/TiddlerTwo");
			expect(wiki.filterTiddlers("[[TiddlerOne]] [[$:/TiddlerTwo]] [[a fourth tiddler]] +[!in-tagtree-of[one]sort[title]]").join(",")).toBe("$:/TiddlerTwo,a fourth tiddler");
		});

		it("should handle inclusive suffix", function() {
			// Without inclusive, root tag itself is not included
			expect(wiki.filterTiddlers("[[one]in-tagtree-of[one]]").join(",")).toBe("");
			// With inclusive, root tag itself is included
			expect(wiki.filterTiddlers("[[one]in-tagtree-of:inclusive[one]]").join(",")).toBe("one");
			expect(wiki.filterTiddlers("[[one]] [[TiddlerOne]] [[Tiddler8]] +[in-tagtree-of:inclusive[one]sort[title]]").join(",")).toBe("one,Tiddler8,TiddlerOne");
		});

		it("should work correctly with non-shadow tiddlers only", function() {
			// "Tiddler8" and "TiddlerSeventh" are shadow tiddlers; ChildOfTiddlerOne is a non-shadow indirect descendant
			expect(wiki.filterTiddlers("[!is[shadow]in-tagtree-of[one]sort[title]]").join(",")).toBe("ChildOfTiddlerOne,Tiddler Three,TiddlerOne");
			expect(wiki.filterTiddlers("[!is[shadow]!in-tagtree-of[one]sort[title]]").join(",")).toBe("$:/ShadowPlugin,$:/TiddlerTwo,a fourth tiddler,one");
		});

		it("should return empty for non-existent root tags", function() {
			expect(wiki.filterTiddlers("[[TiddlerOne]in-tagtree-of[NonExistentTag]]").join(",")).toBe("");
		});

		it("should handle multi-level (indirect) descendants", function() {
			// Tag hierarchy has 3 levels:
			//   Level 1 (root): "one"
			//   Level 2 (direct children): TiddlerOne, Tiddler Three, Tiddler8 (shadow), TiddlerSeventh (shadow)
			//   Level 3 (indirect grandchildren): ChildOfTiddlerOne (tagged with TiddlerOne)

			// Single indirect input: the single-tiddler optimisation fast path does not fire
			// (ChildOfTiddlerOne.tags = ["TiddlerOne"], not ["one"]), so it falls through to getTagDescendants
			expect(wiki.filterTiddlers("[[ChildOfTiddlerOne]in-tagtree-of[one]]").join(",")).toBe("ChildOfTiddlerOne");

			// Multiple inputs including an indirect descendant
			expect(wiki.filterTiddlers("[[TiddlerOne]] [[ChildOfTiddlerOne]] [[$:/TiddlerTwo]] +[in-tagtree-of[one]sort[title]]").join(",")).toBe("ChildOfTiddlerOne,TiddlerOne");

			// Default input (all non-shadow tiddlers): only non-shadow descendants appear
			expect(wiki.filterTiddlers("[in-tagtree-of[one]sort[title]]").join(",")).toBe("ChildOfTiddlerOne,Tiddler Three,TiddlerOne");

			// Including shadow tiddlers in input: all 5 descendants (levels 2 and 3) are returned
			expect(wiki.filterTiddlers("[all[shadows+tiddlers]in-tagtree-of[one]sort[title]]").join(",")).toBe("ChildOfTiddlerOne,Tiddler Three,Tiddler8,TiddlerOne,TiddlerSeventh");
		});

		it("should handle a non-existent single input tiddler", function() {
			// firstTiddler will be undefined; the optimisation fast path is skipped entirely
			expect(wiki.filterTiddlers("[[NonExistentTiddler]in-tagtree-of[one]]").join(",")).toBe("");
			expect(wiki.filterTiddlers("[[NonExistentTiddler]!in-tagtree-of[one]]").join(",")).toBe("NonExistentTiddler");
		});

		it("should handle circular tag references without infinite loops", function() {
			// TagA is tagged with TagB, TagB is tagged with TagA — a direct cycle
			var circularWiki = new $tw.Wiki();
			circularWiki.addTiddlers([
				{title: "TagA", tags: ["TagB"]},
				{title: "TagB", tags: ["TagA"]}
			]);
			// getTagDescendants cycle detection must prevent infinite recursion
			// Both TagA and TagB end up as descendants of each root
			expect(circularWiki.filterTiddlers("[in-tagtree-of[TagA]sort[title]]").join(",")).toBe("TagA,TagB");
			expect(circularWiki.filterTiddlers("[in-tagtree-of[TagB]sort[title]]").join(",")).toBe("TagA,TagB");
		});
	}

});
