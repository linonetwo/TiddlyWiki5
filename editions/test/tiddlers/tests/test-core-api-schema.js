/*\
title: test-core-api-schema.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for core-api-schema, core-api-attributes, and core-api-docs plugins.

Plugins are loaded via tiddlywiki.info, so shadow tiddlers are available in
$tw.wiki and utilities are available in $tw.utils.

\*/
"use strict";

describe("Core API Schema", function() {

	describe("utilities", function() {

		it("should expose validateTiddlerSchema", function() {
			expect(typeof $tw.utils.validateTiddlerSchema).toBe("function");
		});

		it("should expose validateAllBySchema", function() {
			expect(typeof $tw.utils.validateAllBySchema).toBe("function");
		});

		it("should expose getAllSchemas", function() {
			expect(typeof $tw.utils.getAllSchemas).toBe("function");
		});

	});

	describe("schema discovery", function() {

		it("should find all three core schemas", function() {
			var schemas = $tw.utils.getAllSchemas($tw.wiki);
			expect(schemas).toContain("$:/schemas/FilterOperatorDocs");
			expect(schemas).toContain("$:/schemas/WidgetDocs");
			expect(schemas).toContain("$:/schemas/WidgetAttributeDocs");
		});

		it("FilterOperatorDocs schema should declare required fields", function() {
			var schema = $tw.wiki.getTiddler("$:/schemas/FilterOperatorDocs");
			expect(schema).toBeDefined();
			var fields = $tw.utils.parseStringArray(schema.fields.fields || "");
			expect(fields).toContain("op-purpose");
			expect(fields).toContain("op-input");
			expect(fields).toContain("op-output");
		});

		it("WidgetAttributeDocs schema should declare required fields", function() {
			var schema = $tw.wiki.getTiddler("$:/schemas/WidgetAttributeDocs");
			expect(schema).toBeDefined();
			var fields = $tw.utils.parseStringArray(schema.fields.fields || "");
			expect(fields).toContain("field-type");
			expect(fields).toContain("required");
		});

	});

	describe("filter operator attributes", function() {

		it("should have sample filter operator docs under $:/docs/filter-operators/", function() {
			$tw.utils.each(["contains","get","zth","append"],function(name) {
				var t = $tw.wiki.getTiddler("$:/docs/filter-operators/" + name);
				expect(t).withContext("$:/docs/filter-operators/" + name).toBeDefined();
				expect(t.fields["op-purpose"]).withContext(name + " op-purpose").toBeTruthy();
				expect(t.fields.schema).toBe("$:/schemas/FilterOperatorDocs");
			});
		});

		it("should enumerate filter operator docs by prefix", function() {
			var operators = $tw.wiki.filterTiddlers(
				"[all[shadows+tiddlers]prefix[$:/docs/filter-operators/]]"
			);
			expect(operators.length).toBeGreaterThanOrEqual(4);
		});

		it("should validate all FilterOperatorDocs against schema", function() {
			var results = $tw.utils.validateAllBySchema($tw.wiki,"$:/schemas/FilterOperatorDocs");
			expect(results.length).toBeGreaterThanOrEqual(4);
			$tw.utils.each(results,function(result) {
				expect(result.valid).withContext(result.errors.join("; ")).toBe(true);
			});
		});

	});

	describe("widget attributes", function() {

		it("should have sample widget docs under $:/docs/widgets/", function() {
			$tw.utils.each(["ActionNavigateWidget","ActionCreateTiddlerWidget"],function(name) {
				var t = $tw.wiki.getTiddler("$:/docs/widgets/" + name);
				expect(t).withContext("$:/docs/widgets/" + name).toBeDefined();
				expect(t.fields["widget-purpose"]).withContext(name + " widget-purpose").toBeTruthy();
				expect(t.fields["widget-tag-name"]).withContext(name + " widget-tag-name").toBeTruthy();
				expect(t.fields.schema).toBe("$:/schemas/WidgetDocs");
			});
		});

		it("ActionNavigateWidget should have $to and $scroll attribute definitions", function() {
			var base = "$:/docs/widgets/ActionNavigateWidget/attributes/";
			var toAttr = $tw.wiki.getTiddler(base + "$to");
			expect(toAttr).toBeDefined();
			expect(toAttr.fields["field-type"]).toBe("tiddler-title");
			var scrollAttr = $tw.wiki.getTiddler(base + "$scroll");
			expect(scrollAttr).toBeDefined();
			expect(scrollAttr.fields["field-type"]).toBe("yes-no");
		});

		it("ActionCreateTiddlerWidget attributes should include deprecated $savetitle", function() {
			var base = "$:/docs/widgets/ActionCreateTiddlerWidget/attributes/";
			var attrs = $tw.wiki.filterTiddlers("[all[shadows+tiddlers]prefix[" + base + "]]");
			expect(attrs.length).toBeGreaterThanOrEqual(5);
			var saveTitleAttr = $tw.wiki.getTiddler(base + "$savetitle");
			expect(saveTitleAttr).toBeDefined();
			expect(saveTitleAttr.fields.deprecated).toBe("yes");
		});

		it("should validate all WidgetDocs against schema", function() {
			var results = $tw.utils.validateAllBySchema($tw.wiki,"$:/schemas/WidgetDocs");
			expect(results.length).toBeGreaterThanOrEqual(2);
			$tw.utils.each(results,function(result) {
				expect(result.valid).withContext(result.errors.join("; ")).toBe(true);
			});
		});

		it("should validate all WidgetAttributeDocs against schema", function() {
			var results = $tw.utils.validateAllBySchema($tw.wiki,"$:/schemas/WidgetAttributeDocs");
			expect(results.length).toBeGreaterThanOrEqual(8);
			$tw.utils.each(results,function(result) {
				expect(result.valid).withContext(result.errors.join("; ")).toBe(true);
			});
		});

	});

	describe("schema violation detection", function() {

		it("should report missing required field", function() {
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "$:/test/schema/missing-required",
				schema: "$:/schemas/FilterOperatorDocs"
				// op-purpose is required but absent
			}));
			var result = $tw.utils.validateTiddlerSchema($tw.wiki,"$:/test/schema/missing-required");
			expect(result.valid).toBe(false);
			expect(result.errors.some(function(e) { return e.indexOf("op-purpose") !== -1; })).toBe(true);
			$tw.wiki.deleteTiddler("$:/test/schema/missing-required");
		});

		it("should report invalid enum value", function() {
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "$:/test/schema/bad-enum",
				schema: "$:/schemas/WidgetAttributeDocs",
				"field-type": "not-a-real-type",
				"required": "yes"
			}));
			var result = $tw.utils.validateTiddlerSchema($tw.wiki,"$:/test/schema/bad-enum");
			expect(result.valid).toBe(false);
			expect(result.errors.some(function(e) { return e.indexOf("field-type") !== -1; })).toBe(true);
			$tw.wiki.deleteTiddler("$:/test/schema/bad-enum");
		});

		it("should pass for a tiddler without a schema declaration", function() {
			// $:/core is always a shadow tiddler with no schema field
			var result = $tw.utils.validateTiddlerSchema($tw.wiki,"$:/core");
			expect(result.valid).toBe(true);
			expect(result.schemaTitle).toBeNull();
		});

	});

	describe("separation of prose and structured data", function() {

		it("migrated operator doc retains tags but no op-* fields", function() {
			// The prose tiddler keeps its original title for wiki links to resolve
			var prose = $tw.wiki.getTiddler("contains Operator");
			expect(prose).toBeDefined();
			expect((prose.fields.tags || []).indexOf("Filter Operators")).not.toBe(-1);
			expect(prose.fields.caption).toBe("contains");
			// Structured metadata lives in $:/docs/ - not on the prose tiddler
			expect(prose.fields["op-purpose"]).toBeUndefined();
			expect(prose.fields["op-input"]).toBeUndefined();
		});

		it("migrated widget doc retains tags", function() {
			var prose = $tw.wiki.getTiddler("ActionNavigateWidget");
			expect(prose).toBeDefined();
			expect((prose.fields.tags || []).indexOf("Widgets")).not.toBe(-1);
			expect((prose.fields.tags || []).indexOf("ActionWidgets")).not.toBe(-1);
		});

	});

});
