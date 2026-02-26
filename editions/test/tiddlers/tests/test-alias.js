/*\
title: test-alias.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the alias field mechanism:

\*/
"use strict";

describe("Alias field tests", () => {

	describe("wiki.resolveAlias()", () => {
		const wiki = new $tw.Wiki();

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

		it("should return the real title for a declared alias", () => {
			expect(wiki.resolveAlias("my-module")).toBe("$:/plugins/test/lib/my-module");
		});

		it("should resolve a multi-word alias wrapped in [[]]", () => {
			expect(wiki.resolveAlias("my module")).toBe("$:/plugins/test/lib/my-module");
		});

		it("should return the title itself when the tiddler already exists (title takes priority)", () => {
			expect(wiki.resolveAlias("ExistingTiddler")).toBe("ExistingTiddler");
		});

		it("should return null when no tiddler or alias is found", () => {
			expect(wiki.resolveAlias("nonexistent-title")).toBeNull();
		});
	});

	describe("Title priority over alias", () => {
		const wiki = new $tw.Wiki();

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

		it("should return the real tiddler title when a same-named tiddler exists", () => {
			expect(wiki.resolveAlias("short-name")).toBe("short-name");
		});
	});

	describe("Multiple aliases on a single tiddler", () => {
		const wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/lib/prosemirror-model",
			type: "application/javascript",
			"module-type": "library",
			alias: "prosemirror-model pm-model [[ProseMirror Model]]",
			text: "exports.version = 1;"
		});

		it("should resolve all declared aliases", () => {
			expect(wiki.resolveAlias("prosemirror-model")).toBe("$:/plugins/test/lib/prosemirror-model");
			expect(wiki.resolveAlias("pm-model")).toBe("$:/plugins/test/lib/prosemirror-model");
			expect(wiki.resolveAlias("ProseMirror Model")).toBe("$:/plugins/test/lib/prosemirror-model");
		});
	});

	describe("getTiddlerBacklinks() with alias", () => {
		const wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "RealTarget",
			alias: "short-target",
			text: "I am the real target"
		});
		wiki.addTiddler({
			title: "SourceA",
			text: "A link to [[RealTarget]]"
		});
		wiki.addTiddler({
			title: "SourceB",
			text: "A link to [[short-target]]"
		});

		it("should include direct backlinks to real title", () => {
			const backlinks = wiki.getTiddlerBacklinks("RealTarget");
			expect(backlinks).toContain("SourceA");
		});

		it("should include backlinks written as alias links", () => {
			const backlinks = wiki.getTiddlerBacklinks("RealTarget");
			expect(backlinks).toContain("SourceB");
		});

		it("should not duplicate sources", () => {
			const backlinks = wiki.getTiddlerBacklinks("RealTarget");
			const sourceACount = backlinks.filter((t) => t === "SourceA").length;
			expect(sourceACount).toBe(1);
		});
	});

	describe("getTiddlerBacktranscludes() with alias", () => {
		const wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "RealContent",
			alias: "content-alias",
			text: "I am real content"
		});
		wiki.addTiddler({
			title: "TranscludeA",
			text: "{{RealContent}}"
		});
		wiki.addTiddler({
			title: "TranscludeB",
			text: "{{content-alias}}"
		});

		it("should include direct backtranscludes", () => {
			const bts = wiki.getTiddlerBacktranscludes("RealContent");
			expect(bts).toContain("TranscludeA");
		});

		it("should include backtranscludes written as alias transcludes", () => {
			const bts = wiki.getTiddlerBacktranscludes("RealContent");
			expect(bts).toContain("TranscludeB");
		});
	});

	// ─── getMissingTitles excludes alias links ────────────────────────────────

	describe("getMissingTitles() with alias", () => {
		const wiki = new $tw.Wiki();

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

		it("should NOT count alias links as missing", () => {
			const missing = wiki.getMissingTitles();
			expect(missing).not.toContain("pkg");
		});

		it("should still count genuinely missing links", () => {
			const missing = wiki.getMissingTitles();
			expect(missing).toContain("truly-missing");
		});
	});

	describe("Transclude via alias ({{alias}} wikitext syntax)", () => {
		const wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/lib/mylib",
			alias: "mylib",
			text: "Hello from mylib"
		});

		it("should resolve the alias in parseTextReference (main transclude path)", () => {
			// parseTextReference is the main path used by the transclude widget for {{alias}}
			const parser = wiki.parseTextReference("mylib", null, null, {});
			expect(parser).not.toBeNull();
		});

		it("should resolve the alias in getTextReferenceParserInfo (text/raw and field transclude path)", () => {
			const info = wiki.getTextReferenceParserInfo("mylib", null, null, {});
			expect(info.sourceText).toBe("Hello from mylib");
		});

		it("should resolve alias when accessing a specific field via transclude", () => {
			// e.g. {{mylib!!alias}} — getTextReferenceParserInfo with field
			const info = wiki.getTextReferenceParserInfo("mylib", "alias", null, {});
			expect(info.sourceText).toContain("mylib");
		});

		it("should still work normally when using the real title", () => {
			const info = wiki.getTextReferenceParserInfo("$:/plugins/test/lib/mylib", null, null, {});
			expect(info.sourceText).toBe("Hello from mylib");
		});
	});

	describe("alias field string array format", () => {
		it("should parse space-separated aliases", () => {
			const arr = $tw.utils.parseStringArray("foo bar baz");
			expect(arr).toEqual(["foo","bar","baz"]);
		});

		it("should parse [[bracket]] syntax for multi-word aliases", () => {
			const arr = $tw.utils.parseStringArray("foo [[hello world]] baz");
			expect(arr).toEqual(["foo","hello world","baz"]);
		});

		it("should deduplicate by default", () => {
			const arr = $tw.utils.parseStringArray("foo foo bar");
			expect(arr).toEqual(["foo","bar"]);
		});
	});

	describe("[alias[]] filter operator", () => {
		const wiki = new $tw.Wiki();

		wiki.addTiddler({
			title: "$:/plugins/test/prosemirror-model",
			alias: "prosemirror-model pm-model",
			text: "ProseMirror model library"
		});
		wiki.addTiddler({
			title: "$:/plugins/test/other",
			alias: "other-alias",
			text: "Other"
		});
		wiki.addTiddler({
			title: "NoAlias",
			text: "No alias here"
		});

		it("should return tiddlers that have the given alias (single-alias match)", () => {
			const result = wiki.filterTiddlers("[alias[prosemirror-model]]");
			expect(result).toContain("$:/plugins/test/prosemirror-model");
			expect(result).not.toContain("$:/plugins/test/other");
			expect(result).not.toContain("NoAlias");
		});

		it("should return tiddlers that have the given alias (second alias in list)", () => {
			const result = wiki.filterTiddlers("[alias[pm-model]]");
			expect(result).toContain("$:/plugins/test/prosemirror-model");
		});

		it("should return empty when no tiddler has the alias", () => {
			const result = wiki.filterTiddlers("[alias[nonexistent-alias]]");
			expect(result.length).toBe(0);
		});

		it("negated [!alias[]] should return source tiddlers without the given alias", () => {
			// Use space-separated filter groups for OR (union), not [a][b][c] which is serial AND
			const result = wiki.filterTiddlers("[[$:/plugins/test/prosemirror-model]] [[$:/plugins/test/other]] [[NoAlias]] +[!alias[prosemirror-model]]");
			expect(result).not.toContain("$:/plugins/test/prosemirror-model");
			expect(result).toContain("$:/plugins/test/other");
			expect(result).toContain("NoAlias");
		});
	});

	// ─── require() alias — the core use case from issue #8999 ────────────────

	describe("$tw.modules.execute() with alias (require alias)", () => {
		// Use unique names to avoid polluting the shared global $tw.modules state
		const REAL_TITLE = "$:/test-alias/prosemirror-model-" + Date.now();
		const ALIAS_NAME = "test-alias-prosemirror-model-" + Date.now();
		let originalAliases;

		beforeEach(() => {
			// Save state
			originalAliases = $tw.utils.extend(Object.create(null),$tw.modules.aliases);
			// Register a library module with the full $:/ path
			$tw.modules.define(REAL_TITLE,"library",(module,exports) => {
				exports.name = "prosemirror-model";
				exports.version = "1.0.0";
			});
			// Register the alias mapping (normally done by defineTiddlerModules)
			$tw.modules.aliases[ALIAS_NAME] = REAL_TITLE;
		});

		afterEach(() => {
			// Restore aliases, remove the test module
			$tw.modules.aliases = originalAliases;
			delete $tw.modules.titles[REAL_TITLE];
		});

		it("require(short-alias) should return the module exports of the real title", () => {
			// This is the core scenario from issue #8999:
			// require('prosemirror-model') resolves to $:/plugins/tiddlywiki/prosemirror/lib/prosemirror-model
			const result = $tw.modules.execute(ALIAS_NAME);
			expect(result).toBeDefined();
			expect(result.name).toBe("prosemirror-model");
			expect(result.version).toBe("1.0.0");
		});

		it("require(full-title) should still work as before", () => {
			const result = $tw.modules.execute(REAL_TITLE);
			expect(result).toBeDefined();
			expect(result.name).toBe("prosemirror-model");
		});

		it("require() result is cached — calling twice returns the same exports object", () => {
			const r1 = $tw.modules.execute(ALIAS_NAME);
			const r2 = $tw.modules.execute(ALIAS_NAME);
			expect(r1).toBe(r2);
		});

		it("alias should NOT shadow a real title — full title wins", () => {
			// If a module is registered both under an alias and as a direct title,
			// the direct title should be used first
			const DIRECT_TITLE = ALIAS_NAME; // same name as alias
			$tw.modules.define(DIRECT_TITLE,"library",(module,exports) => {
				exports.name = "direct";
			});
			const result = $tw.modules.execute(ALIAS_NAME);
			expect(result.name).toBe("direct");
			// cleanup
			delete $tw.modules.titles[DIRECT_TITLE];
		});
	});

});
