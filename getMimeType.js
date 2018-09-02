const defaultMimeType = "text/plain";

const mimeTypes = {
  "js": "application/javascript",
  "txt": "text/plain"
};

const getMimeType = (ext) => {
  if (mimeTypes.hasOwnProperty(ext)) {
    return mimeTypes[ext];
  }
  return defaultMimeType;
};

module.exports = getMimeType;
