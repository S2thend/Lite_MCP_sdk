"use strict";

exports.SSEServerTransport = void 0;
var _rawBody = _interopRequireDefault(require("raw-body"));
var _contentType = _interopRequireDefault(require("content-type"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
    this.onclose = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
  }

  /**
   * Handles the initial SSE connection request.
   *
   * This should be called when a GET request is made to establish the SSE stream.
   */
  async start() {
    if (this._sseResponse) {
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
      const ct = _contentType.default.parse(req.headers["content-type"] ? req.headers["content-type"] : "");
      if (ct.type !== "application/json") {
        throw new Error(`Unsupported content-type: ${ct}`);
      }
      body = parsedBody ? parsedBody : await (0, _rawBody.default)(req, {
        limit: MAXIMUM_MESSAGE_SIZE,
        encoding: ct.parameters.charset ? ct.parameters.charset : "utf-8"
      });
    } catch (error) {
      res.writeHead(400).end(String(error));
      this.onerror(error);
      return;
    }
    try {
      await this.handleMessage(typeof body === 'string' ? JSON.parse(body) : body);
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
    let validatedMessage;
    try {
      validatedMessage = validator(message);
    } catch (error) {
      this.onerror(error);
      throw error;
    }
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
exports.SSEServerTransport = SSEServerTransport;