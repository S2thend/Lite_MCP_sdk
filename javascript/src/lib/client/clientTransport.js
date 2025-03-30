import { EventSource } from "eventsource";

export class SSEClientTransport{
  constructor(
    url,
    opts,
  ) {
    this._eventSource = undefined;
    this._endpoint = undefined;
    this._abortController = undefined; 
    this._url = url;
    this._eventSourceInit = opts ? opts.eventSourceInit:undefined;
    this._requestInit = opts ? opts.requestInit:undefined;

    this.onclose = ()=>{};
    this.onerror = ()=>{};
    this.onmessage = ()=>{};
  }
  async _commonHeaders(){
    const headers = {};
    // if (this._authProvider) {
    //   const tokens = await this._authProvider.tokens();
    //   if (tokens) {
    //     headers["Authorization"] = `Bearer ${tokens.access_token}`;
    //   }
    // }

    return headers;
  }

  async _start() {
    return new Promise((resolve, reject) => {
      this._eventSource = new EventSource(
        this._url.href,
        this._eventSourceInit?
          this._eventSourceInit:
          {
            fetch: (url, init) => this._commonHeaders()
            .then(
                (headers) => fetch(url, {
                    ...init,
                    headers: {
                    ...headers,
                    Accept: "text/event-stream"
                    }
                })
            ),
          }
      );

      this._abortController = new AbortController();

      this._eventSource.onerror = (event) => {
        const error = new Error(event.code + " " + event.message + " " + event.type);
        reject(error);
        if(this.onerror){
          this.onerror(error);
        }
      };

      this._eventSource.onopen = () => {
        // The connection is open, but we need to wait for the endpoint to be received.
      };

      this._eventSource.addEventListener("endpoint", (event) => {
        const messageEvent = event;

        try {
          this._endpoint = new URL(messageEvent.data, this._url);
          if (this._endpoint.origin !== this._url.origin) {
            throw new Error(
              `Endpoint origin does not match connection origin: ${this._endpoint.origin}`,
            );
          }
        } catch (error) {
          reject(error);
          if(this.onerror){
            this.onerror(error);
          }

          void this.close();
          return;
        }

        resolve();
      });

      this._eventSource.onmessage = (event) => {
        const messageEvent = event;
        let message;
        try {
          message = JSON.parse(messageEvent.data);
        } catch (error) {
          if(this.onerror){
            this.onerror(error);
          }
          return;
        }

        if(this.onmessage){
          this.onmessage(message);
        }
      };
    });
  }

  async start() {
    if (this._eventSource) {
      throw new Error(
        "SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    }

    return await this._start();
  }

  async close() {
    if(this._abortController){
      this._abortController.abort();
    }
    if(this._eventSource){
      this._eventSource.close();
    }
    if(this.onclose){
      this.onclose();
    }
  }

  async send(message) {
    if (!this._endpoint) {
      throw new Error("Not connected");
    }

    try {
      const headers = new Headers({ ...(this._requestInit ? this._requestInit.headers:{}) });
      headers.set("content-type", "application/json");
      const init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController ? this._abortController.signal : undefined,
      };

      const response = await fetch(this._endpoint, init);
      // console.log("POST response", response);
      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(
          `Error POSTing to endpoint (HTTP ${response.status}): ${text}`,
        );
      }
    } catch (error) {
      if(this.onerror){
        this.onerror(error);
      }
      throw error;
    }
  }
}