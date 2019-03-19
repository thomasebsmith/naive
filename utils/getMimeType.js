// utils/getMimeType.js
//
// This file provides a function for getting the mime type for a given file
//  extension. Currently, only a few basic file extensions are supported. The
//  text/plain mime type is returned for unsupported file extensions.
const defaultMimeType = "text/plain";

const mimeTypes = {
  "css": "text/css",
  "js": "application/javascript",
  "htm": "text/html",
  "html": "text/html",
  "txt": "text/plain"
};

const getMimeType = (ext) => {
  if (mimeTypes.hasOwnProperty(ext)) {
    return mimeTypes[ext];
  }
  return defaultMimeType;
};

module.exports = getMimeType;
