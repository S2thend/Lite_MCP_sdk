"use strict";

exports.mergeCapabilities = mergeCapabilities;
function mergeCapabilities(base, additional) {
  return Object.entries(additional).reduce((acc, [key, value]) => {
    if (value && typeof value === "object") {
      acc[key] = acc[key] ? {
        ...acc[key],
        ...value
      } : value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {
    ...base
  });
}