## Lite mcp for javascript Introduction
[![npm badge](https://img.shields.io/badge/npm-0.1.0-blue.svg)](https://www.npmjs.com/package/lite-mcp-sdk)
[![compatibility badge](https://img.shields.io/badge/compatibility->=ES6-blue.svg)](https://shields.io/)
[![License badge](https://img.shields.io/badge/License-MIT-<COLOR>.svg)](https://shields.io/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](code_of_conduct.md)


Lite mcp for javascript is the **BEST** yet way to start a REMOTE **SSE** 
javascript MCP server and Client.

### 🚀 Quick start
REAL **COPY AND PASTE** experince for you to get started with MCP.

### Installation
```bash
npm install litemcpjs
npm install express
npm install cors
```

### Build a SSE MCP client under 5 lines
```javascript
import { MCPClient } from "litemcpjs";

async function main() {
  const client = new MCPClient("http://localhost:3000") // change this to your server url
  await client.connect()
  await client.listTools()
  const result = await client.callTool("calculate-bmi", {weightKg: 70, heightM: 1.75})
  console.log(result)
}

main();
```

### Start a REMOTE MCP SSE server with expressJS
```javascript
const { MCPServerInit } = require("litemcpjs");

// define the tools
const TOOLS = [
    {
        name: "calculate-bmi",
        description: "Calculate the BMI of a person",
        inputSchema: {
            type: "object",
            properties: {
                weightKg: { type: "number" },
                heightM: { type: "number" },
            },
            required: ["weightKg", "heightM"],
        },
        method: async ({ weightKg, heightM }) => {
            return {
                content: [{
                    type: "text",                
                    text: String(weightKg / (heightM * heightM))
                }]
            }
        }
    }
];

// define extra handlers for resources etc.
const handlers = {};

// compatible for server have .use(middleware) method such as express
const middlewares = [
    cors(),
];

const MCPapp = express();  

const MCPServer = MCPServerInit(
    MCPapp,
    middlewares,
    handlers,
    TOOLS,
).listen(5556);
```

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

Please read the [contributing document](https://github.com/S2thend/Lite_MCP_sdk/blob/main/CONTRIBUTING.md).

## 📝 Licensing

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Inspired by Original anthropic sdk,which license is also included [here](../docs/misc/MCP_TS_SDK_LICENSE_ANTHROPIC).