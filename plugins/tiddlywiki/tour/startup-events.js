/*\
title: $:/plugins/tiddlywiki/tour/startup-events.js
type: application/javascript
module-type: startup

Tour completion events and persisted progress

\*/

"use strict";

exports.name = "tour-events";
exports.platforms = ["browser"];
exports.after = ["rootwidget"];
exports.synchronous = true;

var CURRENT_TOUR_TITLE = "$:/config/CurrentTour";
var CURRENT_STEP_TITLE = "$:/state/tour/step";
var SHOW_TOUR_TITLE = "$:/config/ShowTour";

function makeProgressTitle(tourTitle,suffix) {
	if(!tourTitle) {
		return "";
	}
	return "$:/state/tour/progress/" + $tw.utils.encodeURIComponentExtended(tourTitle) + "/" + suffix;
}


function getTourInfo(tourTitle) {
	var info = {
		tourTitle: tourTitle,
		tourTag: "",
		actualCompletionTitle: "",
		totalSteps: 0
	};
	if(!tourTitle) {
		return info;
	}
	var tourTiddler = $tw.wiki.getTiddler(tourTitle);
	if(!tourTiddler) {
		return info;
	}
	info.tourTag = tourTiddler.getFieldString("tour-tag") || "";
	info.actualCompletionTitle = tourTiddler.getFieldString("actualCompletion") || makeProgressTitle(tourTitle,"actualCompletion");
	info.completedStepsTitle = tourTiddler.getFieldString("completedSteps") || makeProgressTitle(tourTitle,"completedSteps");
	if(info.tourTag) {
		info.totalSteps = $tw.wiki.getTiddlersWithTag(info.tourTag).length;
	}
	return info;
}

function getOrderedSteps(info) {
	if(!info.tourTag) {
		return [];
	}
	return $tw.wiki.getTiddlersWithTag(info.tourTag);
}

function getCompletedSteps(info) {
	if(!info.completedStepsTitle) {
		return [];
	}
	if($tw.wiki.getTiddlerText(info.completedStepsTitle + "!!completed","no") === "yes") {
		return getOrderedSteps(info);
	}
	return $tw.wiki.getTiddlerList(info.completedStepsTitle);
}

function saveCompletedSteps(info,completedSteps,isCompleted) {
	if(!info.completedStepsTitle) {
		return;
	}
	var fields = {
		title: info.completedStepsTitle,
		completed: isCompleted ? "yes" : "no"
	};
	if(isCompleted) {
		fields.list = [];
	} else {
		fields.list = completedSteps;
	}
	$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(info.completedStepsTitle),{
		title: fields.title,
		list: fields.list,
		completed: fields.completed
	}));
}

function getValidCompletedSteps(info,completedSteps) {
	var steps = getOrderedSteps(info),
		result = [];
	$tw.utils.each(steps,function(stepTitle) {
		if(completedSteps.indexOf(stepTitle) !== -1) {
			result.push(stepTitle);
		}
	});
	return result;
}

function persistCompletion(info,completion) {
	if(!info.actualCompletionTitle) {
		return;
	}
	$tw.wiki.addTiddler(new $tw.Tiddler($tw.wiki.getTiddler(info.actualCompletionTitle),{
		title: info.actualCompletionTitle,
		text: String(completion)
	}));
}

function syncActualCompletionFromCompletedSteps(info) {
	if(!info.actualCompletionTitle) {
		return;
	}
	var completion = getCompletedSteps(info).length;
	persistCompletion(info,completion);
}

function progressStep(tourTitle,stepTitle) {
	var info = getTourInfo(tourTitle),
		completedSteps,
		normalised;
	if(!stepTitle || !info.tourTag) {
		return;
	}
	completedSteps = getCompletedSteps(info);
	if(completedSteps.indexOf(stepTitle) !== -1) {
		return;
	}
	completedSteps.push(stepTitle);
	normalised = getValidCompletedSteps(info,completedSteps);
	saveCompletedSteps(info,normalised,false);
	syncActualCompletionFromCompletedSteps(info);
}

function deprogressStep(tourTitle,stepTitle) {
	var info = getTourInfo(tourTitle),
		completedSteps,
		normalised;
	if(!stepTitle || !info.tourTag) {
		return;
	}
	completedSteps = getCompletedSteps(info);
	if(completedSteps.indexOf(stepTitle) === -1) {
		return;
	}
	completedSteps = $tw.utils.removeArrayEntries(completedSteps,[stepTitle]);
	normalised = getValidCompletedSteps(info,completedSteps);
	saveCompletedSteps(info,normalised,false);
	syncActualCompletionFromCompletedSteps(info);
}

function persistProgressFromCurrentStep() {
	var tourTitle = $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
		stepTitle = $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,""),
		info = getTourInfo(tourTitle),
		completedSteps,
		normalised,
		changed = false,
		steps,
		stepIndex,
		index;
	if(!info.tourTag || !stepTitle) {
		return;
	}
	steps = getOrderedSteps(info);
	stepIndex = steps.indexOf(stepTitle);
	if(stepIndex < 0) {
		return;
	}
	completedSteps = getCompletedSteps(info);
	for(index = 0; index < stepIndex; index++) {
		if(completedSteps.indexOf(steps[index]) === -1) {
			completedSteps.push(steps[index]);
			changed = true;
		}
	}
	if(changed) {
		normalised = getValidCompletedSteps(info,completedSteps);
		saveCompletedSteps(info,normalised,false);
	}
	if(changed || info.actualCompletionTitle) {
		syncActualCompletionFromCompletedSteps(info);
	}
}

function resumeTourFromSavedProgress() {
	if($tw.wiki.getTiddlerText(SHOW_TOUR_TITLE,"hide") !== "show") {
		return;
	}
	var tourTitle = $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
		currentStepTitle = $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,""),
		info = getTourInfo(tourTitle),
		steps,
		completedSteps,
		highestCompletedIndex = -1,
		targetIndex,
		targetStepTitle,
		index;
	if(!info.tourTag) {
		return;
	}
	steps = getOrderedSteps(info);
	if(!steps || !steps.length) {
		return;
	}
	completedSteps = getCompletedSteps(info);
	for(index = 0; index < steps.length; index++) {
		if(completedSteps.indexOf(steps[index]) !== -1) {
			highestCompletedIndex = index;
		}
	}
	if(highestCompletedIndex < 0) {
		return;
	}
	targetIndex = Math.min(highestCompletedIndex + 1,steps.length - 1);
	targetStepTitle = steps[targetIndex];
	if(currentStepTitle === steps[0] && currentStepTitle !== targetStepTitle) {
		$tw.wiki.addTiddler({
			title: CURRENT_STEP_TITLE,
			text: targetStepTitle
		},$tw.wiki.getModificationFields());
	}
}

function buildPayload(event,tourTitle,stepTitle,completion,totalSteps) {
	var payload = {
		tourTitle: tourTitle,
		stepTitle: stepTitle,
		completion: completion,
		totalSteps: totalSteps,
		event: event
	};
	return payload;
}

exports.startup = function() {
	persistProgressFromCurrentStep();
	resumeTourFromSavedProgress();
	$tw.wiki.addEventListener("change",function(changes) {
		if(changes[CURRENT_TOUR_TITLE] || changes[CURRENT_STEP_TITLE]) {
			persistProgressFromCurrentStep();
		}
		if(changes[CURRENT_TOUR_TITLE] || changes[CURRENT_STEP_TITLE] || changes[SHOW_TOUR_TITLE]) {
			resumeTourFromSavedProgress();
		}
	});

	$tw.rootWidget.addEventListener("tm-tour-step-completed",function(event) {
		var paramObject = event.paramObject || {},
			tourTitle = paramObject.tour || $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
			stepTitle = paramObject.step || $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,""),
			info = getTourInfo(tourTitle),
			completion;
		progressStep(tourTitle,stepTitle);
		completion = getCompletedSteps(info).length;
		$tw.hooks.invokeHook("th-tour-step-completed",buildPayload(event,tourTitle,stepTitle,completion,info.totalSteps));
	});

	$tw.rootWidget.addEventListener("tm-tour-completed",function(event) {
		var paramObject = event.paramObject || {},
			tourTitle = paramObject.tour || $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
			stepTitle = paramObject.step || $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,""),
			info = getTourInfo(tourTitle),
			steps = getOrderedSteps(info),
			completion;
		saveCompletedSteps(info,steps,true);
		syncActualCompletionFromCompletedSteps(info);
		completion = steps.length;
		$tw.hooks.invokeHook("th-tour-completed",buildPayload(event,tourTitle,stepTitle,completion,info.totalSteps));
	});

	$tw.rootWidget.addEventListener("tm-tour-progress-step",function(event) {
		var paramObject = event.paramObject || {},
			tourTitle = paramObject.tour || $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
			stepTitle = paramObject.step || $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,"");
		progressStep(tourTitle,stepTitle);
	});

	$tw.rootWidget.addEventListener("tm-tour-deprogress-step",function(event) {
		var paramObject = event.paramObject || {},
			tourTitle = paramObject.tour || $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
			stepTitle = paramObject.step || $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,"");
		deprogressStep(tourTitle,stepTitle);
	});

	$tw.rootWidget.addEventListener("tm-tour-toggle-step-completed",function(event) {
		var paramObject = event.paramObject || {},
			tourTitle = paramObject.tour || $tw.wiki.getTiddlerText(CURRENT_TOUR_TITLE,""),
			stepTitle = paramObject.step || $tw.wiki.getTiddlerText(CURRENT_STEP_TITLE,""),
			info = getTourInfo(tourTitle),
			completedSteps = getCompletedSteps(info);
		if(completedSteps.indexOf(stepTitle) === -1) {
			progressStep(tourTitle,stepTitle);
		} else {
			deprogressStep(tourTitle,stepTitle);
		}
	});
};
