/*\
title: test-problem-registry.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Usage-oriented tests for the startup problem registry.

\*/

"use strict";

if($tw.node) {
	describe("Problem registry usage tests", function() {
		const problemRegistryStartup = require("$:/core/modules/startup/problem-registry.js");
		const Logger = require("$:/core/modules/utils/logger.js").Logger;

		beforeAll(function() {
			problemRegistryStartup.startup();
		});

		beforeEach(function() {
			$tw.problemRegistry.clearAll();
		});

		it("supports direct reporting and snapshot diff", function() {
			const before = $tw.problemRegistry.takeSnapshot();

			$tw.reportProblem({
				owner: "test/problem-registry/direct",
				resource: "Usage/Direct",
				severity: "warning",
				code: "usage-direct",
				message: "Direct usage message"
			});

			const allProblems = $tw.problemRegistry.list();
			const after = $tw.problemRegistry.takeSnapshot();
			const diff = $tw.diffProblemSnapshots(before,after);
			const summary = $tw.problemRegistry.getSummary();

			expect(allProblems.length).toBe(1);
			expect(allProblems[0].owner).toBe("test/problem-registry/direct");
			expect(summary.total).toBe(1);
			expect(summary.warnings).toBe(1);
			expect(diff.added.length).toBe(1);
			expect(diff.removed.length).toBe(0);
		});

		it("bridges logger.alert into the registry", function() {
			spyOn(console,"error").and.callFake(function() {});
			const logger = new Logger("usage-logger",{
				enable: true,
				save: false
			});

			logger.alert("Logger bridge usage message");

			const loggerProblems = $tw.problemRegistry.list({owner: "logger/usage-logger"});
			expect(loggerProblems.length).toBe(1);
			expect(loggerProblems[0].code).toBe("logger-alert");
			expect(loggerProblems[0].message).toContain("Logger bridge usage message");
		});

		it("detects missing return in hook pipe mode", function() {
			spyOn(console,"warn").and.callFake(function() {});
			function badPipeHook(value) {
				return;
			}
			$tw.hooks.addHook("th-problem-registry-usage",badPipeHook);

			const input = {fields: {title: "Usage/HookResource"}};
			const result = $tw.hooks.invokeHook("th-problem-registry-usage",input);

			$tw.hooks.removeHook("th-problem-registry-usage",badPipeHook);

			const hookProblems = $tw.problemRegistry.list().filter(function(problem) {
				return problem.code === "hook-pipe-missing-return" &&
					problem.details &&
					problem.details.hookName === "th-problem-registry-usage";
			});

			expect(result).toBeUndefined();
			expect(hookProblems.length).toBe(1);
			expect(hookProblems[0].resource).toBe("Usage/HookResource");
		});
	});
}
