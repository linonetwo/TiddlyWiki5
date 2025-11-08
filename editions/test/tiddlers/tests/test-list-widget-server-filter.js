/*\
title: test-list-widget-server-filter.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for list widget server-side filtering

\*/

"use strict";

// Only include in Node.js environment
if($tw.node) {

	var Server = require("$:/core/modules/server/server.js").Server;

	describe("List Widget Server-Side Filtering", function() {

		var serverInstance = null;
		var nodeServer = null;
		var baseUrl = "http://127.0.0.1:8082";

		beforeAll(function() {
			if(!$tw.node) {
				return;
			}

			// Create test tiddlers
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "TestJournal1",
				tags: "Journal",
				text: "First journal entry",
				created: "20240101120000000"
			}));
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "TestJournal2",
				tags: "Journal",
				text: "Second journal entry",
				created: "20240102120000000"
			}));
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "TestOther",
				tags: "Other",
				text: "Not a journal entry"
			}));

			// Enable all external filters
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "$:/config/Server/AllowAllExternalFilters",
				text: "yes"
			}));

			// Start test server
			serverInstance = new Server({
				wiki: $tw.wiki,
				variables: {
					port: "8082",
					host: "127.0.0.1",
					"csrf-disable": "yes",
					"writers": "(anon)",
					"suppress-server-logs": "yes"
				}
			});
			nodeServer = serverInstance.listen();
			if(typeof nodeServer.requestTimeout !== "undefined") {
				nodeServer.requestTimeout = 0;
			}
			nodeServer.unref();
		});

		afterAll(function(done) {
			if(nodeServer) {
				if(typeof nodeServer.closeAllConnections === "function") {
					nodeServer.closeAllConnections();
				}
				nodeServer.close(function() {
					done();
				});
			} else {
				done();
			}
		});

		it("should use server-side filtering when global config is enabled", function() {
			// Enable global server-side filtering
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "$:/config/ListWidget/UseServerFilter",
				text: "yes"
			}));

			// Create a list widget with filter
			var ListWidget = require("$:/core/modules/widgets/list.js").list;
			var parseTreeNode = {
				type: "list",
				attributes: {
					"filter": {
						type: "string",
						value: "[tag[Journal]sort[created]]"
					}
				},
				children: []
			};
			
			var widgetNode = new ListWidget(parseTreeNode, {
				wiki: $tw.wiki,
				document: $tw.fakeDocument
			});

			// Compute attributes and execute
			widgetNode.computeAttributes();
			widgetNode.execute();
			
			// Verify the widget uses server-side filtering
			expect(widgetNode.filter).toBe("[tag[Journal]sort[created]]");
			expect(widgetNode.serverFilterStateTiddler).toBeDefined();
			expect(widgetNode.serverFilterNonce).toBeDefined();
		});

		it("should use local filter when global config is disabled", function() {
			// Ensure global config is disabled
			$tw.wiki.addTiddler(new $tw.Tiddler({
				title: "$:/config/ListWidget/UseServerFilter",
				text: "no"
			}));

			// Create a list widget with filter
			var ListWidget = require("$:/core/modules/widgets/list.js").list;
			var parseTreeNode = {
				type: "list",
				attributes: {
					"filter": {
						type: "string",
						value: "[tag[Journal]sort[created]]"
					}
				},
				children: []
			};
			
			var widgetNode = new ListWidget(parseTreeNode, {
				wiki: $tw.wiki,
				document: $tw.fakeDocument
			});

			// Compute attributes and execute
			widgetNode.computeAttributes();
			widgetNode.execute();
			
			// Verify the widget uses local filtering
			expect(widgetNode.filter).toBe("[tag[Journal]sort[created]]");
			expect(widgetNode.serverFilterStateTiddler).toBeUndefined();
			expect(widgetNode.serverFilterNonce).toBeUndefined();
		});

	});

}
