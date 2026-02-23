/*\
title: $:/plugins/tiddlywiki/core-api-schema/utils/validate-schema.js
type: application/javascript
module-type: utils

Schema validation utilities for TiddlyWiki tiddler fields.

Validates tiddlers against schema definitions following the convention from
GitHub Issue #9677: schema root tiddlers define a `fields` list, and
sub-tiddlers under the schema root define per-field constraints.

\*/

"use strict";

function parseStringArray(value) {
	if(!value) {
		return [];
	}
	if(Array.isArray(value)) {
		return value.slice(0);
	}
	var results = [],
		regexp = /\[\[([^\]]+)\]\]|([^\s]+)/g,
		match;
	while((match = regexp.exec(value)) !== null) {
		results.push(match[1] || match[2]);
	}
	return results;
}

/**
 * Validate a single tiddler against its declared schema.
 *
 * @param {Object} wiki - The $tw.wiki instance
 * @param {string} tiddlerTitle - Title of the tiddler to validate
 * @returns {Object} { valid: boolean, errors: string[], schemaTitle: string|null }
 */
exports.validateTiddlerSchema = function(wiki, tiddlerTitle) {
	var tiddler = wiki.getTiddler(tiddlerTitle);
	var result = { valid: true, errors: [], schemaTitle: null };
	if(!tiddler) {
		result.valid = false;
		result.errors.push("Tiddler not found: " + tiddlerTitle);
		return result;
	}
	// Resolve schema: direct `schema` field, or via tag inheritance
	var schemaTitle = tiddler.fields.schema;
	if(!schemaTitle) {
		// Try to find schema through tags
		var tags = tiddler.fields.tags || [];
		for(var t = 0; t < tags.length; t++) {
			var tagTiddler = wiki.getTiddler(tags[t]);
			if(tagTiddler && tagTiddler.fields.schema) {
				schemaTitle = tagTiddler.fields.schema;
				break;
			}
		}
	}
	if(!schemaTitle) {
		// No schema declared — not an error, just nothing to validate
		return result;
	}
	result.schemaTitle = schemaTitle;
	var schemaTiddler = wiki.getTiddler(schemaTitle);
	if(!schemaTiddler) {
		result.valid = false;
		result.errors.push("Schema tiddler not found: " + schemaTitle);
		return result;
	}
	// Get the declared fields list from schema
	var declaredFields = parseStringArray(schemaTiddler.fields.fields || "");
	if(!declaredFields || declaredFields.length === 0) {
		result.valid = false;
		result.errors.push("Schema has no 'fields' list: " + schemaTitle);
		return result;
	}
	// Validate each field defined in the schema
	for(var f = 0; f < declaredFields.length; f++) {
		var fieldName = declaredFields[f];
		var fieldSchemaTitle = schemaTitle + "/" + fieldName;
		var fieldSchemaTiddler = wiki.getTiddler(fieldSchemaTitle);
		if(!fieldSchemaTiddler) {
			// Field definition tiddler missing — skip (non-strict mode)
			continue;
		}
		var fieldValue = tiddler.fields[fieldName];
		var isRequired = (fieldSchemaTiddler.fields.required === "yes");
		var fieldType = fieldSchemaTiddler.fields["field-type"] || "string";
		var enumValues = fieldSchemaTiddler.fields["enum-values"];
		// Check required
		if(isRequired && (!fieldValue || (typeof fieldValue === "string" && fieldValue.trim() === ""))) {
			result.valid = false;
			result.errors.push("Required field '" + fieldName + "' is missing or empty in " + tiddlerTitle);
			continue;
		}
		// Skip further checks if field is absent and not required
		if(!fieldValue || (typeof fieldValue === "string" && fieldValue.trim() === "")) {
			continue;
		}
		// Check enum constraint
		if(fieldType === "enum" && enumValues) {
			var allowedValues = parseStringArray(enumValues);
			if(allowedValues.indexOf(fieldValue) === -1) {
				result.valid = false;
				result.errors.push("Field '" + fieldName + "' has value '" + fieldValue + "' which is not in allowed values [" + allowedValues.join(", ") + "] in " + tiddlerTitle);
			}
		}
	}
	return result;
};

/**
 * Validate all tiddlers that declare a given schema (by direct `schema` field).
 *
 * @param {Object} wiki - The $tw.wiki instance
 * @param {string} schemaTitle - Title of the schema to validate against
 * @returns {Object[]} Array of validation results
 */
exports.validateAllBySchema = function(wiki, schemaTitle) {
	var results = [];
	// Find all tiddlers (including shadows) with this schema
	wiki.each(function(tiddler, title) {
		if(tiddler.fields.schema === schemaTitle) {
			results.push(exports.validateTiddlerSchema(wiki, title));
		}
	});
	wiki.eachShadow(function(tiddler, title) {
		if(tiddler && tiddler.fields && tiddler.fields.schema === schemaTitle) {
			// Avoid duplicates with real tiddlers
			if(!wiki.tiddlerExists(title)) {
				results.push(exports.validateTiddlerSchema(wiki, title));
			}
		}
	});
	return results;
};

/**
 * Get all schemas available in the wiki.
 *
 * @param {Object} wiki - The $tw.wiki instance
 * @returns {string[]} Array of schema tiddler titles
 */
exports.getAllSchemas = function(wiki) {
	var schemaTag = "$:/tags/Schema";
	return wiki.filterTiddlers("[all[shadows+tiddlers]tag[" + schemaTag + "]]");
};
