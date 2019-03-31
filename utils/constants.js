// utils/constants.js
//
// This file contains application-wide constants that can be used in both the
// background and renderer processes. There are constants for the app name,
// the message sent when content is loaded, the message sent for messages that
// should receive a reply, and a noop function.
module.exports = {
  appName: "Naive",
  contentLoaded: "contentLoaded",
  reply: "reply",
  noop: () => {}
};
