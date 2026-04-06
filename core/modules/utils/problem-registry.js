/*\
title: $:/core/modules/utils/problem-registry.js
type: application/javascript
module-type: utils

Utilities and store implementation for runtime problem registry.

\*/

"use strict";

const PROBLEM_TAG = "$:/tags/Problem";
const SUMMARY_TITLE = "$:/temp/problems/summary";
const PROBLEM_TITLE_PREFIX = "$:/temp/problems/problem-";

const SEVERITY_WEIGHT = {
	error: 4,
	warning: 3,
	info: 2,
	hint: 1
};

const normalizeSeverity = (severity = "warning") => {
	const value = String(severity).toLowerCase();
	return SEVERITY_WEIGHT[value] ? value : "warning";
};

const normalizeOwner = (owner = "unknown") => {
	const value = String(owner);
	return value.trim() || "unknown";
};

const normalizeResource = (resource = "$:/temp/problems/global") => {
	const value = String(resource);
	return value.trim() || "$:/temp/problems/global";
};

const stableStringify = (value) => {
	if(!value || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if(Array.isArray(value)) {
		return `[${value.map(stableStringify).join(",")}]`;
	}
	const keys = Object.keys(value).sort();
	const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
	return `{${parts.join(",")}}`;
};

const compareProblems = (a,b) => {
	const severityCmp = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
	if(severityCmp) {
		return severityCmp;
	}
	const updatedA = a.updatedAt ? a.updatedAt.getTime() : 0;
	const updatedB = b.updatedAt ? b.updatedAt.getTime() : 0;
	if(updatedA !== updatedB) {
		return updatedB - updatedA;
	}
	return a.key.localeCompare(b.key);
};

const guessOwnerFromStack = (excludedModuleTitle) => {
	try {
		throw new Error("trace");
	} catch(error) {
		const stack = error && error.stack ? String(error.stack) : "";
		const matches = stack.match(/\$:\/[A-Za-z0-9_./-]+/g) || [];
		for(let i = 0; i < matches.length; i++) {
			const candidate = matches[i];
			if(candidate !== excludedModuleTitle) {
				return candidate;
			}
		}
	}
	return "unknown";
};

class ProblemRegistry {
	constructor() {
		this.problemsByKey = new Map();
		this.keysByOwnerResource = new Map();
		this.problemTitleByKey = new Map();
		this.problemKeyByTitle = new Map();
	}

	makeOwnerResourceKey(owner,resource) {
		return `${owner}\n${resource}`;
	}

	makeProblemKey(problem) {
		return [
			problem.owner,
			problem.resource,
			problem.severity,
			problem.code,
			problem.message,
			stableStringify(problem.details)
		].join("\n");
	}

	getProblemTitle(key) {
		if(this.problemTitleByKey.has(key)) {
			return this.problemTitleByKey.get(key);
		}
		const baseHash = Math.abs($tw.utils.hashString(key));
		let title = `${PROBLEM_TITLE_PREFIX}${baseHash}`;
		let suffix = 1;
		while(this.problemKeyByTitle.has(title) && this.problemKeyByTitle.get(title) !== key) {
			title = `${PROBLEM_TITLE_PREFIX}${baseHash}-${suffix}`;
			suffix += 1;
		}
		this.problemTitleByKey.set(key,title);
		this.problemKeyByTitle.set(title,key);
		return title;
	}

	normalizeProblem(problem = {},forcedOwner,forcedResource) {
		const owner = normalizeOwner(forcedOwner || problem.owner);
		const resource = normalizeResource(forcedResource || problem.resource);
		const severity = normalizeSeverity(problem.severity);
		const code = problem.code ? String(problem.code) : "generic";
		const message = problem.message ? String(problem.message) : "Unknown problem";
		const details = problem.details;
		const tags = Array.isArray(problem.tags) ? problem.tags.slice() : [];
		const normalized = {
			owner,
			resource,
			severity,
			code,
			message,
			details,
			tags
		};
		normalized.key = this.makeProblemKey(normalized);
		return normalized;
	}

	upsertProblem(normalizedProblem,occurrenceCount,replaceCount) {
		const existing = this.problemsByKey.get(normalizedProblem.key);
		const now = new Date();
		let problem;
		if(existing) {
			problem = existing;
			problem.count = replaceCount ? occurrenceCount : ((problem.count || 1) + occurrenceCount);
			problem.updatedAt = now;
			problem.details = normalizedProblem.details;
			problem.tags = normalizedProblem.tags;
		} else {
			problem = {
				key: normalizedProblem.key,
				owner: normalizedProblem.owner,
				resource: normalizedProblem.resource,
				severity: normalizedProblem.severity,
				code: normalizedProblem.code,
				message: normalizedProblem.message,
				details: normalizedProblem.details,
				tags: normalizedProblem.tags,
				count: occurrenceCount,
				createdAt: now,
				updatedAt: now
			};
			this.problemsByKey.set(problem.key,problem);
		}
		const ownerResourceKey = this.makeOwnerResourceKey(problem.owner,problem.resource);
		let keysForOwnerResource = this.keysByOwnerResource.get(ownerResourceKey);
		if(!keysForOwnerResource) {
			keysForOwnerResource = new Set();
			this.keysByOwnerResource.set(ownerResourceKey,keysForOwnerResource);
		}
		keysForOwnerResource.add(problem.key);
		this.writeProblemTiddler(problem);
		return problem;
	}

	removeProblemByKey(problemKey) {
		const problem = this.problemsByKey.get(problemKey);
		if(!problem) {
			return false;
		}
		this.problemsByKey.delete(problemKey);
		const ownerResourceKey = this.makeOwnerResourceKey(problem.owner,problem.resource);
		const keysForOwnerResource = this.keysByOwnerResource.get(ownerResourceKey);
		if(keysForOwnerResource) {
			keysForOwnerResource.delete(problemKey);
			if(keysForOwnerResource.size === 0) {
				this.keysByOwnerResource.delete(ownerResourceKey);
			}
		}
		this.deleteProblemTiddler(problemKey);
		return true;
	}

	writeProblemTiddler(problem) {
		const title = this.getProblemTitle(problem.key);
		const fields = {
			title,
			text: problem.message,
			tags: [PROBLEM_TAG],
			severity: problem.severity,
			owner: problem.owner,
			resource: problem.resource,
			code: problem.code,
			count: String(problem.count || 1),
			created: problem.createdAt,
			modified: problem.updatedAt,
			"problem-key": problem.key
		};
		if(problem.details !== undefined) {
			fields.details = stableStringify(problem.details);
		}
		if(problem.tags && problem.tags.length) {
			fields["problem-tags"] = $tw.utils.stringifyList(problem.tags);
		}
		$tw.wiki.addTiddler(new $tw.Tiddler(fields));
	}

	deleteProblemTiddler(problemKey) {
		const title = this.problemTitleByKey.get(problemKey);
		if(title) {
			$tw.wiki.deleteTiddler(title);
			this.problemKeyByTitle.delete(title);
			this.problemTitleByKey.delete(problemKey);
		}
	}

	writeSummaryTiddler() {
		const summary = this.getSummary();
		$tw.wiki.addTiddler(new $tw.Tiddler({
			title: SUMMARY_TITLE,
			text: String(summary.total),
			total: String(summary.total),
			errors: String(summary.errors),
			warnings: String(summary.warnings),
			infos: String(summary.infos),
			hints: String(summary.hints),
			modified: new Date()
		}));
	}

	emitChanged(payload = {}) {
		this.writeSummaryTiddler();
		if($tw.eventBus) {
			$tw.eventBus.emit("problems:changed",payload);
		}
	}

	report(problem = {}) {
		const normalizedProblem = this.normalizeProblem(problem);
		const stored = this.upsertProblem(normalizedProblem,1);
		this.emitChanged({
			type: "report",
			keys: [stored.key]
		});
		return stored;
	}

	setProblems(owner,resource,problems = []) {
		const normalizedOwner = normalizeOwner(owner);
		const normalizedResource = normalizeResource(resource);
		const ownerResourceKey = this.makeOwnerResourceKey(normalizedOwner,normalizedResource);
		const previousKeys = this.keysByOwnerResource.get(ownerResourceKey) || new Set();
		const nextKeys = new Set();
		const occurrencesByKey = Object.create(null);
		const normalizedByKey = Object.create(null);
		const changedKeys = [];

		problems.forEach((problemDefinition) => {
			const normalizedProblem = this.normalizeProblem(problemDefinition,normalizedOwner,normalizedResource);
			const key = normalizedProblem.key;
			nextKeys.add(key);
			occurrencesByKey[key] = (occurrencesByKey[key] || 0) + 1;
			normalizedByKey[key] = normalizedProblem;
		});

		previousKeys.forEach((problemKey) => {
			if(!nextKeys.has(problemKey) && this.removeProblemByKey(problemKey)) {
				changedKeys.push(problemKey);
			}
		});

		nextKeys.forEach((problemKey) => {
			const before = this.problemsByKey.get(problemKey);
			const beforeTime = before && before.updatedAt ? before.updatedAt.getTime() : -1;
			const stored = this.upsertProblem(normalizedByKey[problemKey],occurrencesByKey[problemKey],true);
			const afterTime = stored.updatedAt ? stored.updatedAt.getTime() : -1;
			if(!before || beforeTime !== afterTime) {
				changedKeys.push(problemKey);
			}
		});

		if(nextKeys.size > 0) {
			this.keysByOwnerResource.set(ownerResourceKey,nextKeys);
		} else {
			this.keysByOwnerResource.delete(ownerResourceKey);
		}

		this.emitChanged({
			type: "set",
			owner: normalizedOwner,
			resource: normalizedResource,
			keys: changedKeys
		});
	}

	clearAll() {
		const keys = Array.from(this.problemsByKey.keys());
		keys.forEach((key) => {
			this.removeProblemByKey(key);
		});
		this.keysByOwnerResource.clear();
		this.emitChanged({type: "clear-all", keys});
	}

	clearOwner(owner) {
		const normalizedOwner = normalizeOwner(owner);
		const keysToRemove = [];
		this.keysByOwnerResource.forEach((keys,ownerResourceKey) => {
			if(ownerResourceKey.indexOf(`${normalizedOwner}\n`) === 0) {
				keys.forEach((key) => {
					keysToRemove.push(key);
				});
			}
		});
		keysToRemove.forEach((key) => {
			this.removeProblemByKey(key);
		});
		this.emitChanged({type: "clear-owner", owner: normalizedOwner, keys: keysToRemove});
	}

	clearResource(owner,resource) {
		const normalizedOwner = normalizeOwner(owner);
		const normalizedResource = normalizeResource(resource);
		const ownerResourceKey = this.makeOwnerResourceKey(normalizedOwner,normalizedResource);
		const keys = this.keysByOwnerResource.get(ownerResourceKey);
		if(!keys) {
			return;
		}
		Array.from(keys).forEach((key) => {
			this.removeProblemByKey(key);
		});
		this.keysByOwnerResource.delete(ownerResourceKey);
		this.emitChanged({type: "clear-resource", owner: normalizedOwner, resource: normalizedResource});
	}

	clearProblem(problemKey) {
		if(this.removeProblemByKey(problemKey)) {
			this.emitChanged({type: "clear-problem", keys: [problemKey]});
		}
	}

	clearProblemByTiddlerTitle(title) {
		let problemKey = this.problemKeyByTitle.get(title);
		if(!problemKey) {
			const tiddler = $tw.wiki.getTiddler(title);
			if(tiddler) {
				problemKey = tiddler.getFieldString("problem-key");
			}
		}
		if(problemKey) {
			this.clearProblem(problemKey);
		}
	}

	list(filter = {}) {
		const list = [];
		this.problemsByKey.forEach((problem) => {
			if(filter.owner && problem.owner !== filter.owner) {
				return;
			}
			if(filter.resource && problem.resource !== filter.resource) {
				return;
			}
			if(filter.severity && normalizeSeverity(filter.severity) !== problem.severity) {
				return;
			}
			list.push(problem);
		});
		list.sort(compareProblems);
		return list;
	}

	getSummary() {
		const summary = {
			total: 0,
			errors: 0,
			warnings: 0,
			infos: 0,
			hints: 0
		};
		this.problemsByKey.forEach((problem) => {
			summary.total += 1;
			switch(problem.severity) {
				case "error":
					summary.errors += 1;
					break;
				case "warning":
					summary.warnings += 1;
					break;
				case "info":
					summary.infos += 1;
					break;
				case "hint":
					summary.hints += 1;
					break;
			}
		});
		return summary;
	}

	takeSnapshot() {
		const keys = this.list().map((problem) => problem.key);
		return {
			generatedAt: new Date().toISOString(),
			keys
		};
	}

	diffSnapshots(beforeSnapshot = {},afterSnapshot = {}) {
		const beforeKeys = new Set(beforeSnapshot.keys || []);
		const afterKeys = new Set(afterSnapshot.keys || []);
		const added = [];
		const removed = [];
		afterKeys.forEach((key) => {
			if(!beforeKeys.has(key)) {
				added.push(key);
			}
		});
		beforeKeys.forEach((key) => {
			if(!afterKeys.has(key)) {
				removed.push(key);
			}
		});
		return {added, removed};
	}

	clearProjectedTiddlers() {
		const tempProblemTitles = $tw.wiki.filterTiddlers(`[all[shadows+tiddlers]prefix[${PROBLEM_TITLE_PREFIX}]]`);
		tempProblemTitles.forEach((title) => {
			$tw.wiki.deleteTiddler(title);
		});
		$tw.wiki.deleteTiddler(SUMMARY_TITLE);
		this.problemTitleByKey.clear();
		this.problemKeyByTitle.clear();
	}
}

exports.PROBLEM_TAG = PROBLEM_TAG;
exports.SUMMARY_TITLE = SUMMARY_TITLE;
exports.PROBLEM_TITLE_PREFIX = PROBLEM_TITLE_PREFIX;
exports.ProblemRegistry = ProblemRegistry;
exports.guessOwnerFromStack = guessOwnerFromStack;
