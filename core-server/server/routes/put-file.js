/*\
title: $:/core/modules/server/routes/put-file.js
type: application/javascript
module-type: route

PUT /files/:filepath

\*/
"use strict";

exports.method = "PUT";

exports.path = /^\/files\/(.+)$/;

exports.bodyFormat = "stream";

exports.handler = function(request,response,state) {
	var path = require("path"),
		fs = require("fs"),
		filename = $tw.utils.decodeURIComponentSafe(state.params[0]),
		basePath = path.resolve(state.boot.wikiPath,"files"),
		fullPath = path.resolve(basePath,filename);
	// Check that the filename is inside the wiki files folder
	if(path.relative(basePath,fullPath).indexOf("..") === 0) {
		return state.sendResponse(403,{"Content-Type": "text/plain"},"Invalid file path");
	}
	// Create directory if needed
	fs.mkdir(path.dirname(fullPath),{recursive: true},function(err) {
		if(err && err.code !== "EEXIST") {
			$tw.utils.error("Error creating directory for file " + fullPath + ": " + err.toString());
			return state.sendResponse(500,{"Content-Type": "text/plain"},"Directory error");  
		}
		var stream = fs.createWriteStream(fullPath);
		var totalBytes = 0;
		var limitExceeded = false;
		var maxUploadSize = parseInt(process.env.MAX_UPLOAD_SIZE || "1000000000", 10); // 1GB default
		var cleanupPartialUpload = function() {
			fs.unlink(fullPath,function() {});
		};

		request.on("data", function(chunk) {
			totalBytes += chunk.length;
			if(totalBytes > maxUploadSize) {
				limitExceeded = true;
				if(!response.headersSent) {
					state.sendResponse(413,{"Content-Type": "text/plain"},"File too large.");
				}
				request.destroy();
				stream.destroy();
			}
		});

		stream.on("error", function(err) {
			$tw.utils.error("Error writing file " + fullPath + ": " + err.toString());
			if(limitExceeded) {
				cleanupPartialUpload();
			}
			if(!response.headersSent) {
				state.sendResponse(500,{"Content-Type": "text/plain"},"Write error");
			}
		});
		stream.on("close", function() {
			if(limitExceeded) {
				cleanupPartialUpload();
			}
		});
		stream.on("finish", function() {
			if(limitExceeded) return;
			if(state.queryParameters.meta === "true") {
				var ext = path.extname(filename),
					extensionInfo = $tw.utils.getFileExtensionInfo(ext),
					type = extensionInfo ? extensionInfo.type : "application/octet-stream",
					metaContent = "title: " + filename + "\ntype: " + type + "\n\n";
				fs.writeFile(fullPath + ".meta", metaContent, "utf8", function(err) {
					if(err) {
						$tw.utils.error("Error writing meta file " + fullPath + ".meta: " + err.toString());
					}
				});
			}
			if(!response.headersSent) {
				state.sendResponse(204,{"Content-Type": "text/plain"},"");
			}
		});
		request.on("error", function(err) {
			$tw.utils.error("Error reading request for " + fullPath + ": " + err.toString());
			stream.destroy();
		});
		request.pipe(stream);
	});
};
