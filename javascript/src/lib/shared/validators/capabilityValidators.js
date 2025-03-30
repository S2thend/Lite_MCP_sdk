class CapabilityValidatorsClass {

    constructor(serverCapabilities) {
        this._serverCapabilities = serverCapabilities;
        this.SAMPLING_METHOD = "sampling/createMessage";
        this.ROOTS_METHOD = "roots/list";
        this.LOGGING_METHOD = "logging/setLevel";
        this.PROMPTS_METHOD = "prompts/get";
        this.PROMPTS_LIST_METHOD = "prompts/list";
        this.RESOURCES_LIST_METHOD = "resources/list";
        this.RESOURCES_READ_METHOD = "resources/read";
        this.TOOLS_CALL_METHOD = "tools/call";
        this.TOOLS_LIST_METHOD = "tools/list";
        this.PING_METHOD = "ping";
        this.INITIALIZE_METHOD = "initialize";
        this.NOTIFICATIONS_MESSAGE_METHOD = "notifications/message";
        this.NOTIFICATIONS_RESOURCES_UPDATED_METHOD = "notifications/resources/updated";
        this.NOTIFICATIONS_RESOURCES_LIST_CHANGED_METHOD = "notifications/resources/list_changed";
        this.NOTIFICATIONS_TOOLS_LIST_CHANGED_METHOD = "notifications/tools/list_changed";
        this.NOTIFICATIONS_PROMPTS_LIST_CHANGED_METHOD = "notifications/prompts/list_changed";
        this.NOTIFICATIONS_CANCELLED_METHOD = "notifications/cancelled";
        this.NOTIFICATIONS_PROGRESS_METHOD = "notifications/progress";
        this.NOTIFICATIONS_LOGGING_METHOD = "notifications/logging";
    }

    assertCapability(
        capability,
        method,
      ) {
        if (!this._serverCapabilities?.[capability]) {
          throw new Error(
            `Server does not support ${capability} (required for ${method})`,
          );
        }
      }

    assertCapabilityForMethod(method, clientCapabilities) {
        var _a, _b;
        switch (method) {
            case "sampling/createMessage":
                if (!((_a = clientCapabilities) === null || _a === void 0 ? void 0 : _a.sampling)) {
                    throw new Error(`Client does not support sampling (required for ${method})`);
                }
                break;
            case "roots/list":
                if (!((_b = clientCapabilities) === null || _b === void 0 ? void 0 : _b.roots)) {
                    throw new Error(`Client does not support listing roots (required for ${method})`);
                }
                break;
            case "ping":
                // No specific capability required for ping
                break;
        }
    }
    assertNotificationCapability(method, capabilities) {
        switch (method) {
            case "notifications/message":
                if (!capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case "notifications/resources/updated":
            case "notifications/resources/list_changed":
                if (!capabilities.resources) {
                    throw new Error(`Server does not support notifying about resources (required for ${method})`);
                }
                break;
            case "notifications/tools/list_changed":
                if (!capabilities.tools) {
                    throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
                }
                break;
            case "notifications/prompts/list_changed":
                if (!capabilities.prompts) {
                    throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
                }
                break;
            case "notifications/cancelled":
                // Cancellation notifications are always allowed
                break;
            case "notifications/progress":
                // Progress notifications are always allowed
                break;
        }
    }
    assertRequestHandlerCapability(method, capabilities) {
        switch (method) {
            case "sampling/createMessage":
                if (!capabilities.sampling) {
                    throw new Error(`Server does not support sampling (required for ${method})`);
                }
                break;
            case "logging/setLevel":
                if (!capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case "prompts/get":
            case "prompts/list":
                if (!capabilities.prompts) {
                    throw new Error(`Server does not support prompts (required for ${method})`);
                }
                break;
            case "resources/list":
            case "resources/templates/list":
            case "resources/read":
                if (!capabilities.resources) {
                    throw new Error(`Server does not support resources (required for ${method})`);
                }
                break;
            case "tools/call":
            case "tools/list":
                if (!capabilities.tools) {
                    throw new Error(`Server does not support tools (required for ${method})`);
                }
                break;
            case "ping":
            case "initialize":
                // No specific capability required for these methods
                break;
        }
    }
}

const CapabilityValidators = new CapabilityValidatorsClass();

export default CapabilityValidators;