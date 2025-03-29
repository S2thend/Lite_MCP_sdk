"use strict";

exports.Client = void 0;
var _protocol = require("../shared/protocol.js");
var _util = require("../shared/helpers/util.js");
const LATEST_PROTOCOL_VERSION = "2024-11-05";
const SUPPORTED_PROTOCOL_VERSIONS = ["2024-11-05"];
class Client extends _protocol.Protocol {
  /**
   * Initializes this client with the given name and version information.
   */
  constructor(clientInfo, options) {
    super(options);
    this._serverCapabilities = undefined;
    this._serverVersion = undefined;
    this._instructions = undefined;
    this._capabilities = {};
    this._clientInfo = clientInfo;
    this._capabilities = options?.capabilities ?? {};
  }

  /**
   * Registers new capabilities. This can only be called before connecting to a transport.
   *
   * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
   */
  registerCapabilities(capabilities) {
    if (this.transport) {
      throw new Error("Cannot register capabilities after connecting to transport");
    }
    this._capabilities = (0, _util.mergeCapabilities)(this._capabilities, capabilities);
  }
  async connect(transport) {
    await super.connect(transport);
    try {
      // request(
      //     request,
      //     options,
      //     validator = (result) => result,
      // )
      const result = await this.request({
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: this._capabilities,
          clientInfo: this._clientInfo
        }
      });
      if (result === undefined) {
        throw new Error(`Server sent invalid initialize result: ${result}`);
      }
      if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
        throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
      }
      this._serverCapabilities = result.capabilities;
      this._serverVersion = result.serverInfo;
      this._instructions = result.instructions;
      await this.notification({
        method: "notifications/initialized"
      });
    } catch (error) {
      // Disconnect if initialization fails.
      void this.close();
      throw error;
    }
  }

  /**
   * After initialization has completed, this will be populated with the server's reported capabilities.
   */
  getServerCapabilities() {
    return this._serverCapabilities;
  }

  /**
   * After initialization has completed, this will be populated with information about the server's name and version.
   */
  getServerVersion() {
    return this._serverVersion;
  }

  /**
   * After initialization has completed, this may be populated with information about the server's instructions.
   */
  getInstructions() {
    return this._instructions;
  }
  async ping(options) {
    return this.request({
      method: "ping"
    }, options);
  }
  async complete(params, options) {
    return this.request({
      method: "completion/complete",
      params
    }, options);
  }
  async setLoggingLevel(level, options) {
    return this.request({
      method: "logging/setLevel",
      params: {
        level
      }
    }, options);
  }
  async getPrompt(params, options) {
    return this.request({
      method: "prompts/get",
      params
    }, options);
  }
  async listPrompts(params, options) {
    return this.request({
      method: "prompts/list",
      params
    }, options);
  }
  async listResources(params, options) {
    return this.request({
      method: "resources/list",
      params
    }, options);
  }
  async listResourceTemplates(params, options) {
    return this.request({
      method: "resources/templates/list",
      params
    }, options);
  }
  async readResource(params, options) {
    return this.request({
      method: "resources/read",
      params
    }, options);
  }
  async subscribeResource(params, options) {
    return this.request({
      method: "resources/subscribe",
      params
    }, options);
  }
  async unsubscribeResource(params, options) {
    return this.request({
      method: "resources/unsubscribe",
      params
    }, options);
  }
  async callTool(params, options, validator = result => result) {
    return this.request({
      method: "tools/call",
      params
    }, options, validator);
  }
  async listTools(params, options) {
    return this.request({
      method: "tools/list",
      params
    }, options);
  }
  async sendRootsListChanged() {
    return this.notification({
      method: "notifications/roots/list_changed"
    });
  }
}
exports.Client = Client;