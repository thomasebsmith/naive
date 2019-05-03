// utils/getMimeType.js
//
// This file provides a function for getting the mime type for a given file
//  extension. Currently, only a few basic file extensions are supported. The
//  text/plain mime type is returned for unsupported file extensions.
const defaultMimeType = "text/plain";

const mimeTypes = {
  "asm": "text/x-assembly-source",
  "c": "text/x-c-source",
  "cpp": "text/x-cplusplus-source",
  "cs": "text/x-csharp-source",
  "css": "text/css",
  "csv": "text/csv",
  "erl": "text/x-erlang-source",
  "go": "text/x-go-source",
  "h": "text/x-c-source",
  "hpp": "text/x-cplusplus-source",
  "hs": "text/x-haskell-source",
  "htm": "text/html",
  "html": "text/html",
  "java": "text/x-java-source",
  "js": "application/javascript",
  "mat": "application/x-matlab",
  "md": "text/markdown",
  "mjs": "application/javascript",
  "php": "application/x-php",
  "pl": "application/x-perl",
  "py": "application/x-python",
  "r": "application/x-r",
  "rb": "application/x-ruby",
  "rs": "text/x-rust-source",
  "s": "text/x-assembly-source",
  "scala": "text/x-scala-source",
  "sh": "application/x-sh",
  "svg": "image/svg+xml",
  "swift": "text/x-swift-source",
  "txt": "text/plain",
  "vb": "text/x-visualbasic-source",
  "xhtml": "application/xhtml+xml",
  "xml": "text/xml"
};

const getMimeType = (ext) => {
  if (mimeTypes.hasOwnProperty(ext)) {
    return mimeTypes[ext];
  }
  return defaultMimeType;
};

module.exports = getMimeType;
