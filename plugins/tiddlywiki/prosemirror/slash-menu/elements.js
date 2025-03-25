/*\
title: $:/plugins/tiddlywiki/prosemirror/slash-menu/elements.js
type: application/javascript
module-type: library

\*/

"use strict";

var { CommandItem, SubMenu } = require("prosemirror-slash-menu");
var { setBlockType, toggleMark } = require("prosemirror-commands");

var H1Command = {
  id: "Level1",
  label: "H1",
  type: "command",
  command: (view) => {
    setBlockType(view.state.schema.nodes.heading, { level: 1 })(
      view.state,
      view.dispatch,
      view
    );
  },
  available: (view) => true,
};
var H2Command = {
  id: "Level2",
  label: "H2",
  type: "command",
  command: (view) => {
    setBlockType(view.state.schema.nodes.heading, { level: 2 })(
      view.state,
      view.dispatch,
      view
    );
  },
  available: (view) => true,
};
var H3Command = {
  id: "Level3",
  label: "H3",
  type: "command",
  command: (view) => {
    setBlockType(view.state.schema.nodes.heading, { level: 3 })(
      view.state,
      view.dispatch,
      view
    );
  },
  available: (view) => true,
};

var BoldCommand = {
  id: "Bold",
  label: "Bold",
  type: "command",
  command: (view) => {
    const markType = view.state.schema.marks.strong;
    toggleMark(markType)(view.state, view.dispatch, view);
  },
  available: (view) => true,
};
var ItalicCommand = {
  id: "Italic",
  label: "Italic",
  type: "command",
  command: (view) => {
    const markType = view.state.schema.marks.em;
    toggleMark(markType)(view.state, view.dispatch, view);
  },
  available: (view) => true,
};
var CodeCommand = {
  id: "Code",
  label: "Code",
  type: "command",
  command: (view) => {
    const markType = view.state.schema.marks.code;
    toggleMark(markType)(view.state, view.dispatch, view);
  },
  available: (view) => true,
};
var LinkCommand = {
  id: "Link",
  label: "Link",
  type: "command",
  command: (view) => {
    const markType = view.state.schema.marks.link;
    toggleMark(markType)(view.state, view.dispatch, view);
  },
  available: (view) => true,
};

var HeadingsMenu = {
  id: "HeaderMenu",
  label: "Headings",
  type: "submenu",
  available: (view) => true,
  elements: [H1Command, H2Command, H3Command],
};

exports.slashMenuDefaultElements = [
  HeadingsMenu,
  BoldCommand,
  ItalicCommand,
  CodeCommand,
  LinkCommand,
];
