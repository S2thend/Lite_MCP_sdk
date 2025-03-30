const NOTIFICATION_METHOD_NAMES = {
    cancelled: "notifications/cancelled",
    progress: "notifications/progress",
    resourcesUpdated: "notifications/resources/updated",
    resourcesListChanged: "notifications/resources/list_changed",
    toolsListChanged: "notifications/tools/list_changed",
    promptsListChanged: "notifications/prompts/list_changed"
}

const REQUEST_METHOD_NAMES = {
    ping: "ping",
    samplingCreateMessage: "sampling/createMessage",
    loggingSetLevel: "logging/setLevel",
    promptsGet: "prompts/get",
    promptsList: "prompts/list",
}

export const LATEST_PROTOCOL_VERSION = "2024-11-05";
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-10-07",
];

/* JSON-RPC types */
export const JSONRPC_VERSION = "2.0";

/**
 * Error codes defined by the JSON-RPC specification.
 */
export const ErrorCode = {
    // SDK error codes
    ConnectionClosed: -32000,
    RequestTimeout: -32001,
  
    // Standard JSON-RPC error codes
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
  }

export { NOTIFICATION_METHOD_NAMES, REQUEST_METHOD_NAMES, ErrorCode, JSONRPC_VERSION, LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS };