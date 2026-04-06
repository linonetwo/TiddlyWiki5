/*\
title: $:/core/modules/startup/problem-registry.js
type: application/javascript
module-type: startup

Startup wiring for the centralized runtime problem registry.

\*/

"use strict";

const {
	ProblemRegistry,
	PROBLEM_TITLE_PREFIX,
	guessOwnerFromStack
} = require("$:/core/modules/utils/problem-registry.js");

exports.name = "problem-registry";
exports.platforms = ["browser"];
exports.after = ["load-modules","eventbus"];
exports.before = ["plugins","startup","story"];
exports.synchronous = true;

const EARLY_PROBLEM_QUEUE = [];
const STARTUP_MODULE_TITLE = "$:/core/modules/startup/problem-registry.js";

const installReportProblemApi = (registry) => {
	$tw.reportProblem = (problem) => {
		if(registry && typeof registry.report === "function") {
			return registry.report(problem || {});
		}
		if(problem) {
			EARLY_PROBLEM_QUEUE.push(problem);
		}
		return null;
	};
};

const installHookDiagnostics = () => {
	if(!$tw.hooks || $tw.hooks.__problemDiagnosticsPatched) {
		return;
	}

	const originalAddHook = $tw.hooks.addHook;
	$tw.hooks.addHook = function(hookName,definition) {
		if(typeof definition === "function" && !$tw.utils.hop(definition,"__twHookSourceModule")) {
			definition.__twHookSourceModule = guessOwnerFromStack(STARTUP_MODULE_TITLE);
		}
		return originalAddHook.call(this,hookName,definition);
	};

	$tw.hooks.invokeHook = function(hookName,...args) {
		const isPipeMode = args.length > 0;
		if($tw.utils.hop($tw.hooks.names,hookName)) {
			for(let i = 0; i < $tw.hooks.names[hookName].length; i++) {
				const hook = $tw.hooks.names[hookName][i];
				const previousValue = args[0];
				const nextValue = hook.apply(null,args);
				if(isPipeMode && nextValue === undefined && previousValue !== undefined) {
					const owner = hook.__twHookSourceModule || "unknown";
					const resource = previousValue && previousValue.fields && previousValue.fields.title
						? previousValue.fields.title
						: hookName;
					$tw.reportProblem({
						owner,
						resource,
						severity: "warning",
						code: "hook-pipe-missing-return",
						message: "Hook function did not return a value in pipe mode",
						details: {hookName, owner},
						tags: ["hook",hookName,"pipe"]
					});
					console.warn("TiddlyWiki: Hook function did not return a value in pipe mode",hookName,owner);
				}
				args[0] = nextValue;
			}
		}
		return args[0];
	};

	$tw.hooks.__problemDiagnosticsPatched = true;
};

exports.startup = function() {
	installReportProblemApi(null);
	installHookDiagnostics();

	const registry = new ProblemRegistry();
	$tw.problemRegistry = registry;
	installReportProblemApi(registry);

	registry.clearProjectedTiddlers();
	registry.writeSummaryTiddler();

	if($tw.rootWidget) {
		$tw.rootWidget.addEventListener("tm-clear-problems",() => {
			registry.clearAll();
		});
		$tw.rootWidget.addEventListener("tm-clear-problem",(event) => {
			const target = event.param || event.tiddlerTitle || "";
			if(target.indexOf(PROBLEM_TITLE_PREFIX) === 0) {
				registry.clearProblemByTiddlerTitle(target);
			} else if(target) {
				registry.clearProblem(target);
			}
		});
	}

	const bufferedProblems = EARLY_PROBLEM_QUEUE.slice();
	EARLY_PROBLEM_QUEUE.length = 0;
	bufferedProblems.forEach((problem) => {
		registry.report(problem);
	});

	$tw.diffProblemSnapshots = (beforeSnapshot,afterSnapshot) => registry.diffSnapshots(beforeSnapshot,afterSnapshot);
};
