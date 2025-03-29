"use strict";

exports.REQUEST_METHOD_NAMES = exports.NOTIFICATION_METHOD_NAMES = void 0;
const NOTIFICATION_METHOD_NAMES = exports.NOTIFICATION_METHOD_NAMES = {
  cancelled: "notifications/cancelled",
  progress: "notifications/progress",
  resourcesUpdated: "notifications/resources/updated",
  resourcesListChanged: "notifications/resources/list_changed",
  toolsListChanged: "notifications/tools/list_changed",
  promptsListChanged: "notifications/prompts/list_changed"
};
const REQUEST_METHOD_NAMES = exports.REQUEST_METHOD_NAMES = {
  ping: "ping",
  samplingCreateMessage: "sampling/createMessage",
  loggingSetLevel: "logging/setLevel",
  promptsGet: "prompts/get",
  promptsList: "prompts/list"
};