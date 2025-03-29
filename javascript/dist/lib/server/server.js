"use strict";

var _protocol = _interopRequireDefault(require("../shared/protocol.js"));
var _constants = require("../shared/helpers/constants.js");
var _util = require("../shared/helpers/util.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class Server extends _protocol.default {
  /**
   * Initializes this server with the given name and version information.
   */
  constructor(_serverInfo, options) {
    var _a;
    super(options);
    this._serverInfo = _serverInfo;
    if (options) {
      this._capabilities = options.capabilities ? options.capabilities : {};
      this._instructions = options.instructions;
    }
    this.setRequestHandler(_constants.REQUEST_METHOD_NAMES.initialize, request => this._oninitialize(request));
    this.setNotificationHandler(_constants.NOTIFICATION_METHOD_NAMES.initialized, () => {
      if (this.oninitialized) {
        return this.oninitialized();
      }
      return;
    });
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
  async _oninitialize(request) {
    const requestedVersion = request.params.protocolVersion;
    this._clientCapabilities = request.params.capabilities;
    this._clientVersion = request.params.clientInfo;
    return {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION,
      capabilities: this.getCapabilities(),
      serverInfo: this._serverInfo,
      ...(this._instructions && {
        instructions: this._instructions
      })
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
    return this.request({
      method: "ping"
    });
  }
  async createMessage(params, options) {
    return this.request({
      method: "sampling/createMessage",
      params
    }, options);
  }
  async listRoots(params, options) {
    return this.request({
      method: "roots/list",
      params
    }, options);
  }
  async sendLoggingMessage(params) {
    return this.notification({
      method: "notifications/message",
      params
    });
  }
  async sendResourceUpdated(params) {
    return this.notification({
      method: "notifications/resources/updated",
      params
    });
  }
  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed"
    });
  }
  async sendToolListChanged() {
    return this.notification({
      method: "notifications/tools/list_changed"
    });
  }
  async sendPromptListChanged() {
    return this.notification({
      method: "notifications/prompts/list_changed"
    });
  }
}
exports.Server = Server;