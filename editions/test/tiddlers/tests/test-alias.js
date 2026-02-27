/*\
title: test-alias.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the module-alias field mechanism:
- $tw.modules.execute() resolves module-alias to the real module title
- alias field is a string array (space-separated, [[bracket]] for multi-word)
- real title takes priority over module-alias
- require() caches results correctly

\*/
"use strict";

describe("module-alias field tests", () => {

	// ─── module-alias field is a standard TW string array ───────────────────

	describe("module-alias field string array format", () => {
		it("should parse space-separated aliases", () => {
			const arr = $tw.utils.parseStringArray("foo bar baz");
			expect(arr).toEqual(["foo","bar","baz"]);
		});

		it("should parse [[bracket]] syntax for multi-word aliases", () => {
			const arr = $tw.utils.parseStringArray("foo [[hello world]] baz");
			expect(arr).toEqual(["foo","hello world","baz"]);
		});
	});

	// ─── require() via module-alias — the core use case from issue #8999 ────

	describe("$tw.modules.execute() with module-alias (require alias)", () => {
		// Use unique names to avoid polluting the shared global $tw.modules state
		const REAL_TITLE = "$:/test-module-alias/prosemirror-model-" + Date.now();
		const ALIAS_NAME = "test-module-alias-prosemirror-model-" + Date.now();
		let originalAliases;

		beforeEach(() => {
			// Save state
			originalAliases = $tw.utils.extend(Object.create(null),$tw.modules.aliases);
			// Register a library module with the full $:/ path
			$tw.modules.define(REAL_TITLE,"library",(module,exports) => {
				exports.name = "prosemirror-model";
				exports.version = "1.0.0";
			});
			// Register the alias mapping (normally done by defineTiddlerModules via the module-alias field)
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

		it("module-alias should NOT shadow a real title — full title wins", () => {
			// If a module is registered both as a real title and also mapped via alias,
			// the real title takes priority over the alias resolution
			const DIRECT_TITLE = ALIAS_NAME;
			$tw.modules.define(DIRECT_TITLE,"library",(module,exports) => {
				exports.name = "direct";
			});
			const result = $tw.modules.execute(ALIAS_NAME);
			expect(result.name).toBe("direct");
			// cleanup
			delete $tw.modules.titles[DIRECT_TITLE];
		});

		it("multiple aliases can point to the same module", () => {
			const ALIAS2 = "test-module-alias-pm-model-" + Date.now();
			$tw.modules.aliases[ALIAS2] = REAL_TITLE;
			const r1 = $tw.modules.execute(ALIAS_NAME);
			const r2 = $tw.modules.execute(ALIAS2);
			expect(r1.name).toBe("prosemirror-model");
			expect(r2.name).toBe("prosemirror-model");
			delete $tw.modules.aliases[ALIAS2];
		});
	});

	// ─── prosemirror plugin integration: library titles + module-alias ───────
	// Verifies that the prosemirror plugin's tiddlywiki.files declares each JS
	// library tiddler with a proper $:/plugins/... title AND a module-alias that
	// matches what require() calls in the plugin source use.

	describe("prosemirror plugin library tiddlers (module-alias integration)", () => {
		// The known short names used by require() in the prosemirror plugin source
		const KNOWN_ALIASES = [
			"prosemirror-model",
			"prosemirror-state",
			"prosemirror-view",
			"prosemirror-transform",
			"prosemirror-keymap",
			"prosemirror-history",
			"prosemirror-commands",
			"prosemirror-dropcursor",
			"prosemirror-gapcursor",
			"prosemirror-menu",
			"prosemirror-inputrules",
			"prosemirror-schema-basic",
			"prosemirror-flat-list",
			"orderedmap",
			"rope-sequence",
			"crelt",
			"w3c-keyname"
		];
		const PLUGIN_PREFIX = "$:/plugins/tiddlywiki/prosemirror/lib/";

		// After the test wiki boots, the prosemirror plugin tiddlers should be
		// registered as shadow modules. Check $tw.modules.aliases to verify.
		it("all known prosemirror require() short names should be registered as module aliases", () => {
			for(const alias of KNOWN_ALIASES) {
				const resolved = $tw.modules.aliases[alias];
				expect(resolved).withContext(`module-alias '${alias}' should be registered`).toBeDefined();
				if(resolved) {
					expect(resolved).withContext(`alias '${alias}' should resolve to a $:/plugins/... title`).toContain(PLUGIN_PREFIX);
				}
			}
		});

		it("the real title for prosemirror-model should use plugin prefix", () => {
			const resolvedTitle = $tw.modules.aliases["prosemirror-model"];
			expect(resolvedTitle).toBe(`${PLUGIN_PREFIX}prosemirror-model`);
		});

		it("require('prosemirror-model') via execute() should return a module with exports", () => {
			// The prosemirror plugin must be loaded — if it isn't (e.g. the test
			// edition doesn't include it) this test is skipped gracefully.
			if(!$tw.modules.aliases["prosemirror-model"]) {
				pending("prosemirror plugin not loaded in this test edition");
				return;
			}
			const exports = $tw.modules.execute("prosemirror-model");
			expect(exports).toBeDefined();
			// prosemirror-model always exports a Schema constructor
			expect(exports.Schema).toBeDefined();
		});
	});

});
