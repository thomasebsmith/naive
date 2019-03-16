// utils/isProduction.js
//
// This file provides a utility to check if the current app run should be
//  in production or developer mode. Its only export is a boolean that is
//  true iff it is production. This is determined by the presence of an
//  external environment variable "ELECTRON_IS_DEVELOPER" which should be 1
//  to avoid a production state.
module.exports = require("process").env.ELECTRON_IS_DEVELOPER !== "1";
