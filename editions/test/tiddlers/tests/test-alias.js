/*\
title: test-alias.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the alias field mechanism:
- wiki.resolveAlias()
- Link widget isMissing resolution via alias
- Backlinks via alias
- Backtranscludes via alias
- getMissingTitles excludes alias links
- Transclude via alias (getTextReferenceParserInfo)
- Multiple aliases per tiddler (string array format)

\*/
"use strict";

describe("Alias field tests", function() {

	// ─── resolveAlias ────────────────────────────────────────────────────────

	describe("wiki.resolveAlias()", function() {
		var wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/lib/my-module",
			type: "application/javascript",
			"module-type": "library",
			alias: "my-module [[my module]]",
			text: "exports.hello = 'world';"
		});
		wiki.addTiddler({
			title: "ExistingTiddler",
			text: "I exist"
		});

		it("should return the real title for a declared alias", function() {
			expect(wiki.resolveAlias("my-module")).toBe("$:/plugins/test/lib/my-module");
		});

		it("should resolve a multi-word alias wrapped in [[]]", function() {
			expect(wiki.resolveAlias("my module")).toBe("$:/plugins/test/lib/my-module");
		});

		it("should return the title itself when the tiddler already exists (title takes priority)", function() {
			expect(wiki.resolveAlias("ExistingTiddler")).toBe("ExistingTiddler");
		});

		it("should return null when no tiddler or alias is found", function() {
			expect(wiki.resolveAlias("nonexistent-title")).toBeNull();
		});
	});

	// ─── Title priority over alias ────────────────────────────────────────────

	describe("Title priority over alias", function() {
		var wiki = new $tw.Wiki();

		// A real tiddler named "short-name" exists
		wiki.addTiddler({
			title: "short-name",
			text: "I am the real short-name tiddler"
		});
		// Another tiddler tries to claim "short-name" as alias
		wiki.addTiddler({
			title: "$:/plugins/test/lib/something",
			type: "application/javascript",
			"module-type": "library",
			alias: "short-name",
			text: "exports.x = 1;"
		});

		it("should return the real tiddler title when a same-named tiddler exists", function() {
			expect(wiki.resolveAlias("short-name")).toBe("short-name");
		});
	});

	// ─── Multiple aliases ─────────────────────────────────────────────────────

	describe("Multiple aliases on a single tiddler", function() {
		var wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/lib/prosemirror-model",
			type: "application/javascript",
			"module-type": "library",
			alias: "prosemirror-model pm-model [[ProseMirror Model]]",
			text: "exports.version = 1;"
		});

		it("should resolve all declared aliases", function() {
			expect(wiki.resolveAlias("prosemirror-model")).toBe("$:/plugins/test/lib/prosemirror-model");
			expect(wiki.resolveAlias("pm-model")).toBe("$:/plugins/test/lib/prosemirror-model");
			expect(wiki.resolveAlias("ProseMirror Model")).toBe("$:/plugins/test/lib/prosemirror-model");
		});
	});

	// ─── Backlinks via alias ──────────────────────────────────────────────────

	describe("getTiddlerBacklinks() with alias", function() {
		var wiki = new $tw.Wiki();

		// RealTarget declares alias "short-target"
		wiki.addTiddler({
			title: "RealTarget",
			alias: "short-target",
			text: "I am the real target"
		});
		// SourceA links to the real title
		wiki.addTiddler({
			title: "SourceA",
			text: "A link to [[RealTarget]]"
		});
		// SourceB links via alias
		wiki.addTiddler({
			title: "SourceB",
			text: "A link to [[short-target]]"
		});

		it("should include direct backlinks to real title", function() {
			var backlinks = wiki.getTiddlerBacklinks("RealTarget");
			expect(backlinks).toContain("SourceA");
		});

		it("should include backlinks written as alias links", function() {
			var backlinks = wiki.getTiddlerBacklinks("RealTarget");
			expect(backlinks).toContain("SourceB");
		});

		it("should not duplicate sources", function() {
			var backlinks = wiki.getTiddlerBacklinks("RealTarget");
			var sourceACount = backlinks.filter(function(t) { return t === "SourceA"; }).length;
			expect(sourceACount).toBe(1);
		});
	});

	// ─── Backtranscludes via alias ────────────────────────────────────────────

	describe("getTiddlerBacktranscludes() with alias", function() {
		var wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "RealContent",
			alias: "content-alias",
			text: "I am real content"
		});
		// TranscludeA uses the real title
		wiki.addTiddler({
			title: "TranscludeA",
			text: "{{RealContent}}"
		});
		// TranscludeB uses the alias
		wiki.addTiddler({
			title: "TranscludeB",
			text: "{{content-alias}}"
		});

		it("should include direct backtranscludes", function() {
			var bts = wiki.getTiddlerBacktranscludes("RealContent");
			expect(bts).toContain("TranscludeA");
		});

		it("should include backtranscludes written as alias transcludes", function() {
			var bts = wiki.getTiddlerBacktranscludes("RealContent");
			expect(bts).toContain("TranscludeB");
		});
	});

	// ─── getMissingTitles excludes alias links ────────────────────────────────

	describe("getMissingTitles() with alias", function() {
		var wiki = new $tw.Wiki();

		// "real-pkg" exists with alias "pkg"
		wiki.addTiddler({
			title: "real-pkg",
			alias: "pkg",
			text: "I exist"
		});
		// A tiddler that links to "pkg" (alias) and to "truly-missing"
		wiki.addTiddler({
			title: "Consumer",
			text: "[[pkg]] and [[truly-missing]]"
		});

		it("should NOT count alias links as missing", function() {
			var missing = wiki.getMissingTitles();
			expect(missing).not.toContain("pkg");
		});

		it("should still count genuinely missing links", function() {
			var missing = wiki.getMissingTitles();
			expect(missing).toContain("truly-missing");
		});
	});

	// ─── Transclude via alias (getTextReferenceParserInfo) ───────────────────

	describe("Transclude via alias", function() {
		var wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/lib/mylib",
			alias: "mylib",
			text: "Hello from mylib"
		});

		it("should resolve the alias when transcluding with {{mylib}}", function() {
			// getTextReferenceParserInfo is used by the transclude widget
			var info = wiki.getTextReferenceParserInfo("mylib", null, null, {});
			expect(info.sourceText).toBe("Hello from mylib");
		});

		it("should still work normally when using the real title", function() {
			var info = wiki.getTextReferenceParserInfo("$:/plugins/test/lib/mylib", null, null, {});
			expect(info.sourceText).toBe("Hello from mylib");
		});
	});

	// ─── alias field is a standard TW string array ────────────────────────────

	describe("alias field string array format", function() {
		it("should parse space-separated aliases", function() {
			var arr = $tw.utils.parseStringArray("foo bar baz");
			expect(arr).toEqual(["foo","bar","baz"]);
		});

		it("should parse [[bracket]] syntax for multi-word aliases", function() {
			var arr = $tw.utils.parseStringArray("foo [[hello world]] baz");
			expect(arr).toEqual(["foo","hello world","baz"]);
		});

		it("should deduplicate by default", function() {
			var arr = $tw.utils.parseStringArray("foo foo bar");
			expect(arr).toEqual(["foo","bar"]);
		});
	});

});
