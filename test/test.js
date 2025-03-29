import { Client } from "../javascript/src/lib/client/client.js";
import { SSEClientTransport } from "../javascript/src/lib/client/clientTransport.js";

const proxyServerUrl = "http://localhost:5556";
const transportType = "sse";
const command = "node";
const args = ["test.js"];
const env = {};
const bearerToken = null;
const sseUrl = "http://localhost:5556/sse";

let client;
const connect = async (_e, retryCount = 0) => {
    try {
    client = new Client(
        {
          name: "mcp-inspector",
          version: "0.1.0"
        },
        {
          capabilities: {
            sampling: {},
            roots: {
              listChanged: true,
            },
          },
        },
      );

      const backendUrl = new URL(`${proxyServerUrl}/sse`);

      backendUrl.searchParams.append("transportType", transportType);
      if (transportType === "stdio") {
        backendUrl.searchParams.append("command", command);
        backendUrl.searchParams.append("args", args);
        backendUrl.searchParams.append("env", JSON.stringify(env));
      } else {
        backendUrl.searchParams.append("url", sseUrl);
      }

      const headers = {};

      const token = bearerToken || "hahahahahahahanotoken";
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // add timeout to headers
      headers["timeout"] = 10000;

      const clientTransport = new SSEClientTransport(backendUrl, {
        eventSourceInit: {
          fetch: (url, init) => fetch(url, { ...init, headers }),
        },
        requestInit: {
          headers,
        },
      });

    await client.connect(clientTransport);
 

      const capabilities = client.getServerCapabilities();
      console.log("capabilities", capabilities);

      // if (onPendingRequest) {
      //   client.setRequestHandler((request) => {
      //     return new Promise((resolve, reject) => {
      //       onPendingRequest(request, resolve, reject);
      //     });
      //   });
      // }

      // if (getRoots) {
      //   client.setRequestHandler(async () => {
      //     return { roots: getRoots() };
      //   });
      // }


    } catch (e) {
      console.error(e);

    }
  };

  let progressTokenRef = 0;


  const callTool = async (name, params) => {
    const response = await makeRequest(
      {
        method: "tools/call",
        params: {
          name,
          arguments: params,
          _meta: {
            progressToken: progressTokenRef++,
          },
        },
      },
    );
    return response;
  };

  const makeRequest = async (
    request,
    options,
  ) => {
    if (!client) {
      await connect();
      // await new Promise((resolve) => setTimeout(resolve, 10000)); //DEBUG
    }
    if (!client) {
      throw new Error("MCP client not connected");
    }else{
      console.log("mcpClient", client);
    }

    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Request timed out");
        abortController.abort("Request timed out");
      }, 100000);

      let response;
      try {
        response = await client.request(request, {
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

  const listTools = async () => {
    const response = await makeRequest(
      {
        method: "tools/list",
        params: {cursor: "0"},
      },
    );
    console.log("listTools", response);
    console.log(response.tools[0].inputSchema);
  };


  async function main() {
    await connect();
    await listTools();
    await callTool("puppeteer_navigate", {url: "https://www.google.com"});
  }

  main();

