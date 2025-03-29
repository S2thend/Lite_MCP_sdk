try {
    const resolvedPath = require.resolve("your-sdk-name");
    console.log("Module resolved at:", resolvedPath);
  } catch (err) {
    console.error("Module resolution error:", err.message);
  }

const yourSdk = require("your-sdk-name");
console.log("SDK loaded:", yourSdk); // Debug what's being loaded

const { Server, SSEServerTransport } = yourSdk;

const puppeteer = require("puppeteer-core");
const express = require("express");
const cors = require("cors");

const TOOLS = [
    {
        name: "puppeteer_navigate",
        description: "Navigate to a URL",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string" },
            },
            required: ["url"],
        },
    },
    {
        name: "puppeteer_screenshot",
        description: "Take a screenshot of the current page or a specific element",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name for the screenshot" },
                selector: { type: "string", description: "CSS selector for element to screenshot" },
                width: { type: "number", description: "Width in pixels (default: 800)" },
                height: { type: "number", description: "Height in pixels (default: 600)" },
            },
            required: ["name"],
        },
    },
    {
        name: "puppeteer_click",
        description: "Click an element on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for element to click" },
            },
            required: ["selector"],
        },
    },
    {
        name: "puppeteer_fill",
        description: "Fill out an input field",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for input field" },
                value: { type: "string", description: "Value to fill" },
            },
            required: ["selector", "value"],
        },
    },
    {
        name: "puppeteer_select",
        description: "Select an element on the page with Select tag",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for element to select" },
                value: { type: "string", description: "Value to select" },
            },
            required: ["selector", "value"],
        },
    },
    {
        name: "puppeteer_hover",
        description: "Hover an element on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for element to hover" },
            },
            required: ["selector"],
        },
    },
    {
        name: "puppeteer_evaluate",
        description: "Execute JavaScript in the browser console",
        inputSchema: {
            type: "object",
            properties: {
                script: { type: "string", description: "JavaScript code to execute" },
            },
            required: ["script"],
        },
    },
];
// Global state
let browser;
let page;
const consoleLogs = [];
const screenshots = new Map();
async function ensureBrowser() {
    if (!browser) {

        browser = await puppeteer.launch({
            executablePath: '/opt/google/chrome/chrome', 
            headless: false,
            slowMo: 2
        });

        const pages = await browser.pages();
        page = pages[0];
        page.on("console", (msg) => {
            const logEntry = `[${msg.type()}] ${msg.text()}`;
            consoleLogs.push(logEntry);
            server.notification({
                method: "notifications/resources/updated",
                params: { uri: "console://logs" },
            });
        });
    }
    return page;
}
async function handleToolCall(name, args) {
    const page = await ensureBrowser();
    switch (name) {
        case "puppeteer_navigate":
            await page.goto(args.url);
            return {
                content: [{
                        type: "text",
                        text: `Navigated to ${args.url}`,
                    }],
                isError: false,
            };
        case "puppeteer_screenshot": {
            const width = args.width ?? 800;
            const height = args.height ?? 600;
            await page.setViewport({ width, height });
            const screenshot = await (args.selector ?
                (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
                page.screenshot({ encoding: "base64", fullPage: false }));
            if (!screenshot) {
                return {
                    content: [{
                            type: "text",
                            text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
                        }],
                    isError: true,
                };
            }
            screenshots.set(args.name, screenshot);
            server.notification({
                method: "notifications/resources/list_changed",
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Screenshot '${args.name}' taken at ${width}x${height}`,
                    },
                    {
                        type: "image",
                        data: screenshot,
                        mimeType: "image/png",
                    },
                ],
                isError: false,
            };
        }
        case "puppeteer_click":
            try {
                await page.click(args.selector);
                return {
                    content: [{
                            type: "text",
                            text: `Clicked: ${args.selector}`,
                        }],
                    isError: false,
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "text",
                            text: `Failed to click ${args.selector}: ${error.message}`,
                        }],
                    isError: true,
                };
            }
        case "puppeteer_fill":
            try {
                await page.waitForSelector(args.selector);
                await page.type(args.selector, args.value);
                return {
                    content: [{
                            type: "text",
                            text: `Filled ${args.selector} with: ${args.value}`,
                        }],
                    isError: false,
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "text",
                            text: `Failed to fill ${args.selector}: ${error.message}`,
                        }],
                    isError: true,
                };
            }
        case "puppeteer_select":
            try {
                await page.waitForSelector(args.selector);
                await page.select(args.selector, args.value);
                return {
                    content: [{
                            type: "text",
                            text: `Selected ${args.selector} with: ${args.value}`,
                        }],
                    isError: false,
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "text",
                            text: `Failed to select ${args.selector}: ${error.message}`,
                        }],
                    isError: true,
                };
            }
        case "puppeteer_hover":
            try {
                await page.waitForSelector(args.selector);
                await page.hover(args.selector);
                return {
                    content: [{
                            type: "text",
                            text: `Hovered ${args.selector}`,
                        }],
                    isError: false,
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "text",
                            text: `Failed to hover ${args.selector}: ${error.message}`,
                        }],
                    isError: true,
                };
            }
        case "puppeteer_evaluate":
            try {
                const result = await page.evaluate((script) => {
                    const logs = [];
                    const originalConsole = { ...console };
                    ['log', 'info', 'warn', 'error'].forEach(method => {
                        console[method] = (...args) => {
                            logs.push(`[${method}] ${args.join(' ')}`);
                            originalConsole[method](...args);
                        };
                    });
                    try {
                        const result = eval(script);
                        Object.assign(console, originalConsole);
                        return { result, logs };
                    }
                    catch (error) {
                        Object.assign(console, originalConsole);
                        throw error;
                    }
                }, args.script);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Execution result:\n${JSON.stringify(result.result, null, 2)}\n\nConsole output:\n${result.logs.join('\n')}`,
                        },
                    ],
                    isError: false,
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: "text",
                            text: `Script execution failed: ${error.message}`,
                        }],
                    isError: true,
                };
            }
        default:
            return {
                content: [{
                        type: "text",
                        text: `Unknown tool: ${name}`,
                    }],
                isError: true,
            };
    }
}

const server = new Server({
    name: "example-servers/puppeteer",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Setup request handlers
server.setRequestHandler("resources/list", async () => ({
    resources: [
        {
            uri: "console://logs",
            mimeType: "text/plain",
            name: "Browser console logs",
        },
        ...Array.from(screenshots.keys()).map(name => ({
            uri: `screenshot://${name}`,
            mimeType: "image/png",
            name: `Screenshot: ${name}`,
        })),
    ],
}));
server.setRequestHandler("resources/read", async (request) => {
    const uri = request.params.uri.toString();
    if (uri === "console://logs") {
        return {
            contents: [{
                    uri,
                    mimeType: "text/plain",
                    text: consoleLogs.join("\n"),
                }],
        };
    }
    if (uri.startsWith("screenshot://")) {
        const name = uri.split("://")[1];
        const screenshot = screenshots.get(name);
        if (screenshot) {
            return {
                contents: [{
                        uri,
                        mimeType: "image/png",
                        blob: screenshot,
                    }],
            };
        }
    }
    throw new Error(`Resource not found: ${uri}`);
});

// Add handlers for tools
server.setRequestHandler("tools/list", async () => {
    return {
        tools: TOOLS
    };
});

server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
});

const MCPapp = express();  

// nocors
MCPapp.use(cors());

const transports = new Map();

MCPapp.get("/sse", async (req, res) => {
    console.log("SSE request received", req);
    const clientId = req.query.clientId || 'default';
    const transport = new SSEServerTransport("/messages", res);
    transports.set(clientId, transport);
    await server.connect(transport);
});

MCPapp.post("/messages", async (req, res) => {
    console.log("POST request received", req);
    const clientId = req.query.clientId || 'default';
    const transport = transports.get(clientId);
    if (!transport) {
        return res.status(404).send('Client connection not found');
    }
    await transport.handlePostMessage(req, res);
});


const MCPserver = MCPapp.listen(5556);



// MCPserver.close(() => {
//     console.log('MCP app closed'); // Log server close
// });