'use strict';

var getRawBody = require('raw-body');
var contentType = require('content-type');

const MAXIMUM_MESSAGE_SIZE = "4mb";

/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This transport is only available in Node.js environments.
 */
class SSEServerTransport {
  /**
   * Creates a new SSE server transport, which will direct the client to POST messages to the relative or absolute URL identified by `_endpoint`.
   */
  constructor(_endpoint, res) {
    this._endpoint = _endpoint;
    this.res = res;
    this._sessionId = crypto.randomUUID();
    this._sseResponse = undefined;
    if (!this.onclose) {
      this.onclose = () => {};
    }
    if (!this.onerror) {
      this.onerror = () => {};
    }
    if (!this.onmessage) {
      this.onmessage = () => {};
    }
  }

  /**
   * Handles the initial SSE connection request.
   *
   * This should be called when a GET request is made to establish the SSE stream.
   */
  async start() {
    console.log("start");
    if (this._sseResponse) {
      console.log("SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.");
      throw new Error("SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.");
    }
    this.res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    // Send the endpoint event
    this.res.write(`event: endpoint\ndata: ${encodeURI(this._endpoint)}?sessionId=${this._sessionId}\n\n`);
    this._sseResponse = this.res;
    this.res.on("close", () => {
      this._sseResponse = undefined;
      if (this.onclose) {
        this.onclose();
      }
    });
  }

  /**
   * Handles incoming POST messages.
   *
   * This should be called when a POST request is made to send a message to the server.
   */
  async handlePostMessage(req, res, parsedBody) {
    if (!this._sseResponse) {
      const message = "SSE connection not established";
      res.writeHead(500).end(message);
      throw new Error(message);
    }
    let body;
    try {
      const ct = contentType.parse(req.headers["content-type"] ? req.headers["content-type"] : "");
      if (ct.type !== "application/json") {
        throw new Error(`Unsupported content-type: ${ct}`);
      }
      body = parsedBody ? parsedBody : await getRawBody(req, {
        limit: MAXIMUM_MESSAGE_SIZE,
        encoding: ct.parameters.charset ? ct.parameters.charset : "utf-8"
      });
    } catch (error) {
      res.writeHead(400).end(String(error));
      this.onerror(error);
      return;
    }
    try {
      const parsedMessage = typeof body === 'string' ? JSON.parse(body) : body;
      console.log("handleMessage", parsedMessage);
      await this.handleMessage(parsedMessage);
    } catch {
      res.writeHead(400).end(`Invalid message: ${body}`);
      return;
    }
    res.writeHead(202).end("Accepted");
  }

  /**
   * Handle a client message, regardless of how it arrived. This can be used to inform the server of messages that arrive via a means different than HTTP POST.
   */
  async handleMessage(message, validator = res => res) {
    console.log("handleMessage", message);
    let validatedMessage;
    try {
      validatedMessage = validator(message);
      console.log("validatedMessage", validatedMessage);
    } catch (error) {
      this.onerror(error);
      throw error;
    }
    console.log("onmessage", this.onmessage);
    this.onmessage(validatedMessage);
  }
  async close() {
    if (this._sseResponse) {
      this._sseResponse.end();
      this._sseResponse = undefined;
    }
    if (this.onclose) {
      this.onclose();
    }
  }
  async send(message) {
    if (!this._sseResponse) {
      throw new Error("Not connected");
    }
    this._sseResponse.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
  }

  /**
   * Returns the session ID for this transport.
   *
   * This can be used to route incoming POST requests.
   */
  get sessionId() {
    return this._sessionId;
  }
}

class CapabilityValidators {
  constructor(serverCapabilities) {
    this._serverCapabilities = serverCapabilities;
  }
  assertCapability(capability, method) {
    var _this$_serverCapabili;
    if (!((_this$_serverCapabili = this._serverCapabilities) !== null && _this$_serverCapabili !== void 0 && _this$_serverCapabili[capability])) {
      throw new Error(`Server does not support ${capability} (required for ${method})`);
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
    }
  }
}
CapabilityValidators = new CapabilityValidators();
var CapabilityValidators$1 = CapabilityValidators;

const NOTIFICATION_METHOD_NAMES = {
  cancelled: "notifications/cancelled",
  progress: "notifications/progress"};
const REQUEST_METHOD_NAMES = {
  ping: "ping"};

class Protocol {
  // attributes:
  //     - `_options`: Configuration options for the Protocol instance
  // - `_requestMessageId`: Counter for generating unique message IDs
  // - `_requestHandlers`: Map of request method names to handler functions
  // - `_requestHandlerAbortControllers`: Map of request IDs to AbortControllers
  // - `_notificationHandlers`: Map of notification method names to handler functions
  // - `_responseHandlers`: Map of message IDs to response handler functions
  // - `_progressHandlers`: Map of message IDs to progress handler functions
  // - `_timeoutInfo`: Map of message IDs to timeout information
  // - `_transport`: Current transport instance used for communication
  constructor(options) {
    // attributes declaration
    this._options = {};
    this._requestMessageId = 0;
    this._requestHandlers = new Map();
    this._requestHandlerAbortControllers = new Map();
    this._notificationHandlers = new Map();
    this._responseHandlers = new Map();
    this._progressHandlers = new Map();
    this._transport = null;
    this.setNotificationHandler(NOTIFICATION_METHOD_NAMES.cancelled, notification => {
      const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
      if (controller) {
        controller.abort(notification.params.reason);
      }
    });
    this.setNotificationHandler(NOTIFICATION_METHOD_NAMES.progress, notification => {
      this._onprogress(notification);
    });
    this.setRequestHandler(REQUEST_METHOD_NAMES.ping,
    // Automatic pong by default.
    _request => ({}));
    this._options = options;
  }

  /**
   * Attaches to the given transport, starts it, and starts listening for messages.
   *
   * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
   */
  async connect(transport) {
    this._transport = transport;
    this._transport.onclose = () => {
      this._onclose();
    };
    this._transport.onerror = error => {
      this._onerror(error);
    };
    this._transport.onmessage = message => {
      console.log("onmessage", message);
      if (!("method" in message)) {
        console.log("onresponse", message);
        this._onresponse(message);
      } else if ("id" in message) {
        console.log("onrequest", message);
        this._onrequest(message);
      } else {
        console.log("onnotification", message);
        this._onnotification(message);
      }
    };
    await this._transport.start();
  }
  _onclose() {
    const responseHandlers = this._responseHandlers;
    this._responseHandlers = new Map();
    this._progressHandlers.clear();
    this._transport = undefined;
    if (this.onclose) {
      this.onclose();
    }
    const error = new Error("Connection closed");
    for (const handler of responseHandlers.values()) {
      handler(error);
    }
  }
  _onerror(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
  _onnotification(notification) {
    const handler = this._notificationHandlers.get(notification.method) ? this._notificationHandlers.get(notification.method) : this.fallbackNotificationHandler;

    // Ignore notifications not being subscribed to.
    if (handler === undefined) {
      return;
    }

    // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
    Promise.resolve().then(() => handler(notification)).catch(error => this._onerror(new Error(`Uncaught error in notification handler: ${error}`)));
  }
  _onrequest(request) {
    const handler = this._requestHandlers.get(request.method) ? this._requestHandlers.get(request.method) : this.fallbackRequestHandler;
    if (handler === undefined) {
      console.log("handler undefined");
      if (this._transport) {
        this._transport.send({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: ErrorCode.MethodNotFound,
            message: "Method not found"
          }
        }).catch(error => this._onerror(new Error(`Failed to send an error response: ${error}`)));
      }
      return;
    }
    const abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request.id, abortController);

    // Create extra object with both abort signal and sessionId from transport
    const extra = {
      signal: abortController.signal,
      sessionId: this._transport ? this._transport.sessionId : null
    };
    console.log("extra", extra);
    // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
    Promise.resolve().then(() => handler(request, extra)).then(result => {
      console.log("result", result);
      if (abortController.signal.aborted) {
        console.log("abortController.signal.aborted");
        return;
      }
      if (this._transport) {
        console.log("sending result");
        return this._transport.send({
          result,
          jsonrpc: "2.0",
          id: request.id
        });
      }
      return;
    }, error => {
      console.log("error", error);
      if (abortController.signal.aborted) {
        return;
      }
      if (this._transport) {
        return this._transport.send({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: Number.isSafeInteger(error["code"]) ? error["code"] : ErrorCode.InternalError,
            message: error.message ? error.message : "Internal error"
          }
        });
      }
      return;
    }).catch(error => this._onerror(new Error(`Failed to send response: ${error}`))).finally(() => {
      this._requestHandlerAbortControllers.delete(request.id);
    });
  }
  _onprogress(notification) {
    const {
      progressToken,
      ...params
    } = notification.params;
    const messageId = Number(progressToken);
    const handler = this._progressHandlers.get(messageId);
    if (!handler) {
      this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
      return;
    }
    this._responseHandlers.get(messageId);
    handler(params);
  }
  _onresponse(response) {
    const messageId = Number(response.id);
    const handler = this._responseHandlers.get(messageId);
    console.log("onresponse", response);
    if (handler === undefined) {
      console.log("handler undefined");
      this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(messageId);
    this._progressHandlers.delete(messageId);
    if ("result" in response) {
      console.log("result in response");
      handler(response);
    } else {
      const error = new Error(response.error.code + " " + response.error.message + " " + response.error.data);
      console.log("error in response", error);
      handler(error);
    }
  }
  get transport() {
    return this._transport;
  }

  /**
   * Closes the connection.
   */
  async close() {
    if (this._transport) {
      await this._transport.close();
    }
  }

  /**
  * Sends a request and wait for a response.
  *
  * Do not use this method to emit notifications! Use notification() instead.
  */
  request(request, options, validator = result => result) {
    return new Promise((resolve, reject) => {
      if (!this._transport) {
        reject(new Error("Not connected"));
        return;
      }
      if (this._options) {
        if (this._options.enforceStrictCapabilities === true) {
          CapabilityValidators$1.assertCapabilityForMethod(request.method, this._clientCapabilities);
        }
      }
      if (options) {
        if (options.signal) {
          options.signal.throwIfAborted();
        }
      }
      const messageId = this._requestMessageId++;
      const jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId
      };
      if (options) {
        if (options.onprogress) {
          this._progressHandlers.set(messageId, options.onprogress);
          jsonrpcRequest.params = {
            ...request.params,
            _meta: {
              progressToken: messageId
            }
          };
        }
      }
      const cancel = reason => {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        if (this._transport) {
          this._transport.send({
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: {
              requestId: messageId,
              reason: String(reason)
            }
          }).catch(error => this._onerror(new Error(`Failed to send cancellation: ${error}`)));
        }
        reject(reason);
      };
      this._responseHandlers.set(messageId, response => {
        if (options) {
          if (options.signal) {
            if (options.signal.aborted) {
              return;
            }
          }
        }
        if (response instanceof Error) {
          return reject(response);
        }
        try {
          const result = validator(response.result);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      if (options) {
        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            cancel(options.signal.reason);
          });
        }
      }
      this._transport.send(jsonrpcRequest).catch(error => {
        reject(error);
      });
    });
  }

  /**
   * Emits a notification, which is a one-way message that does not expect a response.
   */
  async notification(notification) {
    if (!this._transport) {
      throw new Error("Not connected");
    }
    CapabilityValidators$1.assertNotificationCapability(notification.method, this._capabilities);
    const jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0"
    };
    await this._transport.send(jsonrpcNotification);
  }

  /**
   * Registers a handler to invoke when this protocol object receives a request with the given method.
   *
   * Note that this will replace any previous request handler for the same method.
   */
  setRequestHandler(method, handler, validator = request => request) {
    CapabilityValidators$1.assertRequestHandlerCapability(method, this._capabilities);
    this._requestHandlers.set(method, (request, extra) => Promise.resolve(handler(validator(request), extra)));
  }

  /**
   * Removes the request handler for the given method.
   */
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }

  /**
   * Registers a handler to invoke when this protocol object receives a notification with the given method.
   *
   * Note that this will replace any previous notification handler for the same method.
   */
  setNotificationHandler(method, handler, validator = notification => notification) {
    this._notificationHandlers.set(method, notification => Promise.resolve(handler(validator(notification))));
  }

  /**
   * Removes the notification handler for the given method.
   */
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
}

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

const LATEST_PROTOCOL_VERSION$1 = "2024-11-05";
const SUPPORTED_PROTOCOL_VERSIONS$1 = ["2024-11-05"];
class Server extends Protocol {
  /**
   * Initializes this server with the given name and version information.
   */
  constructor(_serverInfo, options) {
    super(options);
    this._capabilities = options ? options.capabilities || {} : {};
    this._instructions = options ? options.instructions : undefined;
    this._serverInfo = _serverInfo;

    // this._clientCapabilities = {};
    // this._clientVersion = undefined;

    /**
    * Callback for when initialization has fully completed (i.e., the client has sent an `initialized` notification).
    */
    this.oninitialized = () => {};

    // Fix: Add missing method names
    this.setRequestHandler("initialize", request => this._oninitialize(request));
    this.setNotificationHandler("initialized", () => {
      if (this.oninitialized) {
        return this.oninitialized();
      }
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
    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
  }
  assertCapabilityForMethod(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._clientCapabilities || !this._clientCapabilities.sampling) {
          throw new Error(`Client does not support sampling (required for ${method})`);
        }
        break;
      case "roots/list":
        if (!this._clientCapabilities || !this._clientCapabilities.roots) {
          throw new Error(`Client does not support listing roots (required for ${method})`);
        }
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/message":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support notifying about resources (required for ${method})`);
        }
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
        }
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
        }
        break;
    }
  }
  assertRequestHandlerCapability(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._capabilities.sampling) {
          throw new Error(`Server does not support sampling (required for ${method})`);
        }
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging) {
          throw new Error(`Server does not support logging (required for ${method})`);
        }
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts) {
          throw new Error(`Server does not support prompts (required for ${method})`);
        }
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources) {
          throw new Error(`Server does not support resources (required for ${method})`);
        }
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) {
          throw new Error(`Server does not support tools (required for ${method})`);
        }
        break;
    }
  }
  async _oninitialize(request) {
    const requestedVersion = request.params.protocolVersion;
    this._clientCapabilities = request.params.capabilities;
    this._clientVersion = request.params.clientInfo;
    return {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS$1.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION$1,
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

const LATEST_PROTOCOL_VERSION = "2024-11-05";
const SUPPORTED_PROTOCOL_VERSIONS = ["2024-11-05"];
class Client extends Protocol {
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
    this._capabilities = (options === null || options === void 0 ? void 0 : options.capabilities) ?? {};
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
    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
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
exports.SSEServerTransport = SSEServerTransport;
exports.Server = Server;
