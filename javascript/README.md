## Lite mcp sdk for javascript Introduction
[![npm badge](https://img.shields.io/badge/npm-0.1.4-blue.svg)](https://www.npmjs.com/package/lite-mcp-sdk)
[![compatibility badge](https://img.shields.io/badge/compatibility->=ES6-blue.svg)](https://shields.io/)
[![License badge](https://img.shields.io/badge/License-MIT-<COLOR>.svg)](https://shields.io/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](code_of_conduct.md)

For Anyone wants a little **more low level control** over the MCP protocol:

Lite mcp sdk for javascript is a lightweight mcp sdk **remix** with minimal dependencies.

### 🚀 Quick start

```bash
npm install lite-mcp-sdk
```

### Server
```javascript
const { Server, SSEServerTransport } = require("lite-mcp-sdk");

//or module import
import { Server, SSEServerTransport } from "lite-mcp-sdk";

//create a server
const server = new Server({
    port: 3000,
    transport: new SSEServerTransport(),
});


// 1. Define the server info
const server = new Server({
    name: "example-servers/puppeteer",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});

// 2. Define the request handlers
server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
});

//3. Define the transport
const transports = new Map();
const transport = new SSEServerTransport("/messages", res);
transports.set(clientId, transport);

//4. Connect the server to the transport
await server.connect(transport);

//5. Handle the post message
await transport.handlePostMessage(req, res);
```
### Client

```javascript
import { Client, SSEClientTransport } from "lite-mcp-sdk";

// 1. Define the client
let client = new Client( {
      name: "fastmcp-client",
      version: "0.1.0"
    }, {
      capabilities: {
        sampling: {},
        roots: {
          listChanged: true,
        },
      },
    } );

// 2. Init the client transport
const serverUrl = "http://localhost:3000"; // for example

const backendUrl = new URL(`${serverUrl}/sse`);
  
backendUrl.searchParams.append("transportType", "sse");

backendUrl.searchParams.append("url", `${serverUrl}/sse`);

const headers = {};

const clientTransport = new SSEClientTransport(backendUrl, {
    eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
    },
    requestInit: {
        headers,
    },
});

// 3. Connect the client to the transport
await client.connect(clientTransport);
const abortController = new AbortController();
let progressTokenRef = 0;

// 4. start the tool call
const name = "toolcall name";
const params = {}; // tool call params

const response = await client.request(
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
    {signal: abortController.signal,}
);
```

## Project structure:
The project is clearly and cleanlyorganized into the following directories:
```shell
src
├── index.js
└── lib
    ├── client
    │   ├── client.js
    │   └── clientTransport.js
    ├── server
    │   ├── server.js
    │   └── serverTransport.js
    └── shared
        ├── helpers
        │   ├── constants.js
        │   └── util.js
        ├── protocol.js
        └── validators
            ├── capabilityValidators.js
            └── schemaValidators.js (IN CONSTRUCTION)
```
## Why choose lite-mcp-sdk?

### 1. No fixed zod types
NO More zod types!!! zod types contributes to unneccessary complexity for easy setups. 

Furthermore, the way zod type is used in the original sdk is rigid and not flexible, and it is an well received issue.
![](./docs/images/Zod_type_Issue.png)
![](./docs/images/Zod_type_issue_official_sdk.png)

### 2. Fully SSE solution

Focus on **SSE**, and removed stdio support for simplicity considerations, since it is not a as univerial solution as SSE.

Suprisingly, the SSE solution is scarce on the internet, so I decided to write my own.

BELOW images shows that stdio support is always descripted, but no SSE support is mentioned.
![](./docs/images/official-doc-detail-no-sse.png)
![](./docs/images/official-doc-readme-no-sse.png)
Even when you search deliberately for SSE, result is scarce, SEE for first page google results.
![](./docs/images/google-first-page-result-hardly-sse.png)

Replace codes like requestSchema.parse to fully customizable validators and hand it over to the user to define the validation logic here. e.g.
```javascript
const validatedMessage = validator(message);
```

How timeout is used in original sdk is vague and has some redundant implementations,which are removed in lite mcp for not causing further confusion.(Ok I think they also removed these in latest version)

### Key Difference Table

| Feature | mcp-official-sdk | lite-mcp-sdk |
|---------|----------|-------------|
| Validation | zod | Validators |
| Transport | stdio or SSE | SSE only |
| Language | typescript | javascript |


## 🗺️ Roadmap

- [ ] Custom Validators (under construction)
- [ ] Add dashboard for monitoring and managing the MCP server and client
- [ ] Add ts types
- [ ] Add python sdk
- [ ] Add version compatibility handle for different versions of MCP


## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

Please read the [contributing document](https://github.com/S2thend/Lite_MCP_sdk/blob/main/CONTRIBUTING.md).

## 📝 Licensing

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Inspired by Original anthropic sdk,which license is also included [here](../docs/misc/MCP_TS_SDK_LICENSE_ANTHROPIC).

