import CapabilityValidators from "./validators/capabilityValidators.js";
import { NOTIFICATION_METHOD_NAMES, REQUEST_METHOD_NAMES, ErrorCode } from "./helpers/constants.js";


export class Protocol {
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

        this.setNotificationHandler(NOTIFICATION_METHOD_NAMES.cancelled, (notification) => {
            const controller = this._requestHandlerAbortControllers.get(
                notification.params.requestId,
            );
            if (controller) {
                controller.abort(notification.params.reason);
            }
        });

        this.setNotificationHandler(NOTIFICATION_METHOD_NAMES.progress, (notification) => {
            this._onprogress(notification);
        });

        this.setRequestHandler(
            REQUEST_METHOD_NAMES.ping,
            // Automatic pong by default.
            (_request) => ({}),
        );

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

        this._transport.onerror = (error) => {
            this._onerror(error);
        };

        this._transport.onmessage = (message) => {
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
        const handler =
            this._notificationHandlers.get(notification.method) ?
            this._notificationHandlers.get(notification.method) :
            this.fallbackNotificationHandler;

        // Ignore notifications not being subscribed to.
        if (handler === undefined) {
            return;
        }

        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => handler(notification))
            .catch((error) =>
                this._onerror(
                    new Error(`Uncaught error in notification handler: ${error}`),
                ),
            );
    }

    _onrequest(request) {
        const handler =
            this._requestHandlers.get(request.method) ?
            this._requestHandlers.get(request.method) :
            this.fallbackRequestHandler;

        if (handler === undefined) {
            console.log("handler undefined");
            if (this._transport) {
                this._transport
                    .send({
                        jsonrpc: "2.0",
                        id: request.id,
                        error: {
                            code: ErrorCode.MethodNotFound,
                            message: "Method not found",
                        },
                    })
                    .catch((error) =>
                        this._onerror(
                            new Error(`Failed to send an error response: ${error}`),
                        ),
                    );
            }
            return;
        }

        const abortController = new AbortController();
        this._requestHandlerAbortControllers.set(request.id, abortController);

        // Create extra object with both abort signal and sessionId from transport
        const extra = {
            signal: abortController.signal,
            sessionId: this._transport ? this._transport.sessionId : null,
        };
        console.log("extra", extra);
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => handler(request, extra))
            .then(
                (result) => {
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
                            id: request.id,
                        });
                    }
                    return;
                },
                (error) => {
                    console.log("error", error);
                    if (abortController.signal.aborted) {
                        return;
                    }
                    if (this._transport) {
                        return this._transport.send({
                            jsonrpc: "2.0",
                            id: request.id,
                            error: {
                                code: Number.isSafeInteger(error["code"])
                                    ? error["code"]
                                    : ErrorCode.InternalError,
                                message: error.message ? error.message : "Internal error",
                            },
                        });
                    }
                    return;
                },
            )
            .catch((error) =>
                this._onerror(new Error(`Failed to send response: ${error}`)),
            )
            .finally(() => {
                this._requestHandlerAbortControllers.delete(request.id);
            });
    }

    _onprogress(notification) {
        const { progressToken, ...params } = notification.params;
        const messageId = Number(progressToken);

        const handler = this._progressHandlers.get(messageId);
        if (!handler) {
            this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
            return;
        }

        const responseHandler = this._responseHandlers.get(messageId);


        handler(params);
    }

    _onresponse(response) {
        const messageId = Number(response.id);
        const handler = this._responseHandlers.get(messageId);
        console.log("onresponse", response);
        if (handler === undefined) {
            console.log("handler undefined");
            this._onerror(
                new Error(
                    `Received a response for an unknown message ID: ${JSON.stringify(response)}`,
                ),
            );
            return;
        }

        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);


        if ("result" in response) {
            console.log("result in response");
            handler(response);
        } else {
            const error = new Error(
                response.error.code + " " + response.error.message + " " + response.error.data,
            );
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
    request(
        request,
        options,
        validator = (result) => result,
    ) {
        return new Promise((resolve, reject) => {
            if (!this._transport) {
                reject(new Error("Not connected"));
                return;
            }

            if (this._options) {
                if (this._options.enforceStrictCapabilities === true) {
                    CapabilityValidators.assertCapabilityForMethod(request.method, this._clientCapabilities);
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
                id: messageId,
            };

            if (options) {
                if (options.onprogress) {
                    this._progressHandlers.set(messageId, options.onprogress);
                    jsonrpcRequest.params = {
                        ...request.params,
                        _meta: { progressToken: messageId },
                    };
                }
            }

            const cancel = (reason) => {
                this._responseHandlers.delete(messageId);
                this._progressHandlers.delete(messageId);

                if (this._transport) {
                    this._transport
                        .send({
                            jsonrpc: "2.0",
                            method: "notifications/cancelled",
                            params: {
                                requestId: messageId,
                                reason: String(reason),
                            },
                        })
                        .catch((error) =>
                            this._onerror(new Error(`Failed to send cancellation: ${error}`)),
                        );
                }

                reject(reason);
            };

            this._responseHandlers.set(messageId, (response) => {
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

            this._transport.send(jsonrpcRequest).catch((error) => {
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

        CapabilityValidators.assertNotificationCapability(notification.method, this._capabilities);

        const jsonrpcNotification = {
            ...notification,
            jsonrpc: "2.0",
        };

        await this._transport.send(jsonrpcNotification);
    }

    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(
        method,
        handler,
        validator = (request) => request,
    ) {
        CapabilityValidators.assertRequestHandlerCapability(method, this._capabilities);
        this._requestHandlers.set(method, (request, extra) =>
            Promise.resolve(handler(validator(request), extra)),
        );
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
    setNotificationHandler(
        method,
        handler,
        validator = (notification) => notification,
    ) {
        this._notificationHandlers.set(
            method,
            (notification) =>
                Promise.resolve(handler(validator(notification))),
        );
    }

    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
        this._notificationHandlers.delete(method);
    }
}
export default Protocol;