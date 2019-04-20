// utils/getMimeType.js
//
// This file provides a function for getting the mime type for a given file
//  extension. Currently, only a few basic file extensions are supported. The
//  text/plain mime type is returned for unsupported file extensions.
const defaultMimeType = "text/plain";

const mimeTypes = {
  "c": "text/x-c-source",
  "cpp": "text/x-cplusplus-source",
  "css": "text/css",
  "h": "text/x-c-source",
  "hpp": "text/x-cplusplus-source",
  "htm": "text/html",
  "html": "text/html",
  "js": "application/javascript",
  "md": "text/markdown",
  "txt": "text/plain"
};

const getMimeType = (ext) => {
  if (mimeTypes.hasOwnProperty(ext)) {
    return mimeTypes[ext];
  }
  return defaultMimeType;
};

module.exports = getMimeType;
