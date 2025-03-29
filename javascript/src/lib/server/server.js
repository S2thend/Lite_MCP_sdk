import Protocol from "../shared/protocol.js";
import { mergeCapabilities } from "../shared/helpers/util.js";

const LATEST_PROTOCOL_VERSION = "2024-11-05";
const SUPPORTED_PROTOCOL_VERSIONS = ["2024-11-05"];


export class Server extends Protocol{
  /**
   * Initializes this server with the given name and version information.
   */
  constructor(
    _serverInfo,
    options,
  ) {
    super(options);
    this._capabilities = options ? (options.capabilities||{}) : {};
    this._instructions = options ? options.instructions : undefined;
    this._serverInfo = _serverInfo;

    // this._clientCapabilities = {};
    // this._clientVersion = undefined;

    /**
   * Callback for when initialization has fully completed (i.e., the client has sent an `initialized` notification).
   */
    this.oninitialized = () => {};

    // Fix: Add missing method names
    this.setRequestHandler("initialize", (request) =>
        this._oninitialize(request),
        );
        this.setNotificationHandler("initialized", () =>{
            if(this.oninitialized){
                return this.oninitialized();
            }
        }
        );
  }

  /**
   * Registers new capabilities. This can only be called before connecting to a transport.
   *
   * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
   */
  registerCapabilities(capabilities) {
    if (this.transport) {
      throw new Error(
        "Cannot register capabilities after connecting to transport",
      );
    }

    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
  }

  assertCapabilityForMethod(method) {
    switch (method) {
      case "sampling/createMessage":
        if(!this._clientCapabilities || !this._clientCapabilities.sampling){
          throw new Error(
            `Client does not support sampling (required for ${method})`,
          );
        }
        break;

      case "roots/list":
        if(!this._clientCapabilities || !this._clientCapabilities.roots){
          throw new Error(
            `Client does not support listing roots (required for ${method})`,
          );
        }
        break;

      case "ping":
        // No specific capability required for ping
        break;
    }
  }

  assertNotificationCapability(
    method,
  ) {
    switch (method) {
      case "notifications/message":
        if (!this._capabilities.logging) {
          throw new Error(
            `Server does not support logging (required for ${method})`,
          );
        }
        break;

      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources) {
          throw new Error(
            `Server does not support notifying about resources (required for ${method})`,
          );
        }
        break;

      case "notifications/tools/list_changed":
        if (!this._capabilities.tools) {
          throw new Error(
            `Server does not support notifying of tool list changes (required for ${method})`,
          );
        }
        break;

      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts) {
          throw new Error(
            `Server does not support notifying of prompt list changes (required for ${method})`,
          );
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

  assertRequestHandlerCapability(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._capabilities.sampling) {
          throw new Error(
            `Server does not support sampling (required for ${method})`,
          );
        }
        break;

      case "logging/setLevel":
        if (!this._capabilities.logging) {
          throw new Error(
            `Server does not support logging (required for ${method})`,
          );
        }
        break;

      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts) {
          throw new Error(
            `Server does not support prompts (required for ${method})`,
          );
        }
        break;

      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources) {
          throw new Error(
            `Server does not support resources (required for ${method})`,
          );
        }
        break;

      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) {
          throw new Error(
            `Server does not support tools (required for ${method})`,
          );
        }
        break;

      case "ping":
      case "initialize":
        // No specific capability required for these methods
        break;
    }
  }

  async _oninitialize(
    request,
  ) {
    const requestedVersion = request.params.protocolVersion;

    this._clientCapabilities = request.params.capabilities;
    this._clientVersion = request.params.clientInfo;

    return {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
        ? requestedVersion
        : LATEST_PROTOCOL_VERSION,
      capabilities: this.getCapabilities(),
      serverInfo: this._serverInfo,
      ...(this._instructions && { instructions: this._instructions }),
    };
  }

  /**
   * After initialization has completed, this will be populated with the client's reported capabilities.
   */
  getClientCapabilities() {
    return this._clientCapabilities;
  }

  /**
   * After initialization has completed, this will be populated with information about the client's name and version.
   */
  getClientVersion() {
    return this._clientVersion;
  }

  getCapabilities() {
    return this._capabilities;
  }

  async ping() {
    return this.request({ method: "ping" });
  }

  async createMessage(
    params,
    options,
  ) {
    return this.request(
      { method: "sampling/createMessage", params },
      options,
    );
  }

  async listRoots(
    params,
    options,
  ) {
    return this.request(
      { method: "roots/list", params },
      options,
    );
  }

  async sendLoggingMessage(params) {
    return this.notification({ method: "notifications/message", params });
  }

  async sendResourceUpdated(params) {
    return this.notification({
      method: "notifications/resources/updated",
      params,
    });
  }

  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed",
    });
  }

  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }

  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }
}