import { Client, SSEClientTransport } from "lite-mcp-sdk";

class MCPClient {
  constructor(
    serverUrl,
    timeout=10000,
    clientInfo={
      name: "fastmcp-client",
      version: "0.1.0"
    },
    opts={
      capabilities: {
        sampling: {},
        roots: {
          listChanged: true,
        },
      },
    },
    authToken,
  ) {
    this.client = null;
    this.serverUrl = serverUrl;
    this.clientInfo = clientInfo;
    this.opts = opts;
    this.authToken = authToken;
    this.timeout = timeout;
    this.progressTokenRef = 0;
  }

  connect = async (
    _e, 
    retryCount = 0,
  ) => {
      try {
        this.client = new Client( this.clientInfo, this.opts );
  
        const backendUrl = new URL(`${this.serverUrl}/sse`);
  
        backendUrl.searchParams.append("transportType", "sse");

        backendUrl.searchParams.append("url", `${this.serverUrl}/sse`);

        const headers = {};
  
        const token = this.authToken;
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
  
        // add timeout to headers
        headers["timeout"] = this.timeout;
  
        const clientTransport = new SSEClientTransport(backendUrl, {
          eventSourceInit: {
            fetch: (url, init) => fetch(url, { ...init, headers }),
          },
          requestInit: {
            headers,
          },
        });
  
        await this.client.connect(clientTransport);
        const capabilities = this.client.getServerCapabilities();
        console.log("capabilities", capabilities);

        return this
      } catch (e) {
        console.error(e);
        return this
      }
    };

    callTool = async (name, params) => {
      const response = await this.makeRequest(
        {
          method: "tools/call",
          params: {
            name,
            arguments: params,
            _meta: {
              progressToken: this.progressTokenRef++,
            },
          },
        },
      );
      return response;
    };

    makeRequest = async (
      request,
      options,
    ) => {
      if (!this.client) {
        await this.connect();
        // await new Promise((resolve) => setTimeout(resolve, 10000)); //DEBUG
      }
      if (!this.client) {
        throw new Error("MCP client not connected");
      }else{
        console.log("mcpClient", this.client);
      }
  
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log("Request timed out");
          abortController.abort("Request timed out");
        }, 100000);
  
        let response;
        try {
          response = await this.client.request(request, {
            signal: abortController.signal,
          });
        } catch (error) {
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
  
        return response;
      } catch (e) {
        throw e;
      }
    };

    listTools = async () => {
      const response = await this.makeRequest(
        {
          method: "tools/list",
          params: {cursor: "0"},
        },
      );
      console.log("listTools", response);
      console.log(response.tools[0].inputSchema);
    };
  
}

export { MCPClient };