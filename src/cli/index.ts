#!/usr/bin/env node
/**
 * AgentMesh CLI - Command-line tool for the AgentMesh network.
 *
 * Usage:
 *   npx @agentmeshworld/sdk connect --url wss://agentmesh.world/ws/v1/agent --key amk_xxx --role buyer
 *   npx @agentmeshworld/sdk status
 *   npx @agentmeshworld/sdk publish order:request '{"goods":"electronics","quantity":100}'
 */

import { parseArgs } from "node:util";
import { Agent, TOPIC_MAP, type MeshEvent } from "../agent.js";
import type { AgentRole } from "../types/messages.js";

// ── Colors (no deps) ──────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const BANNER = `
${c.cyan}${c.bold}    _                    _   __  __           _     ${c.reset}
${c.cyan}${c.bold}   / \\   __ _  ___ _ __ | |_|  \\/  | ___  ___| |__  ${c.reset}
${c.cyan}${c.bold}  / _ \\ / _\` |/ _ \\ '_ \\| __| |\\/| |/ _ \\/ __| '_ \\ ${c.reset}
${c.cyan}${c.bold} / ___ \\ (_| |  __/ | | | |_| |  | |  __/\\__ \\ | | |${c.reset}
${c.cyan}${c.bold}/_/   \\_\\__, |\\___|_| |_|\\__|_|  |_|\\___||___/_| |_|${c.reset}
${c.cyan}${c.bold}        |___/                                        ${c.reset}
${c.dim}  Decentralized Supply Chain Mesh  |  agentmesh.world${c.reset}
`;

function printHelp() {
  console.log(BANNER);
  console.log(`${c.bold}USAGE${c.reset}`);
  console.log(`  ${c.green}agentmesh${c.reset} <command> [options]`);
  console.log();
  console.log(`${c.bold}COMMANDS${c.reset}`);
  console.log(`  ${c.green}connect${c.reset}     Connect an agent to the mesh network`);
  console.log(`  ${c.green}topics${c.reset}      List all available event-to-topic mappings`);
  console.log(`  ${c.green}info${c.reset}        Show SDK and gateway information`);
  console.log(`  ${c.green}help${c.reset}        Show this help message`);
  console.log();
  console.log(`${c.bold}CONNECT OPTIONS${c.reset}`);
  console.log(`  ${c.yellow}--url${c.reset}       Gateway URL (default: wss://agentmesh.world/ws/v1/agent)`);
  console.log(`  ${c.yellow}--key${c.reset}       API key (amk_ prefixed) ${c.red}[required]${c.reset}`);
  console.log(`  ${c.yellow}--role${c.reset}      Agent role: buyer|supplier|logistics|inspector|oracle (default: buyer)`);
  console.log(`  ${c.yellow}--caps${c.reset}      Capabilities, comma-separated (e.g., electronics,semiconductors)`);
  console.log(`  ${c.yellow}--sub${c.reset}       Topics to subscribe, comma-separated (e.g., order:request,order:bid)`);
  console.log();
  console.log(`${c.bold}EXAMPLES${c.reset}`);
  console.log(`  ${c.dim}# Connect as a buyer and subscribe to orders${c.reset}`);
  console.log(`  ${c.green}agentmesh connect${c.reset} --key amk_xxx --role buyer --sub order:bid,order:status`);
  console.log();
  console.log(`  ${c.dim}# Connect as a supplier listening for purchase orders${c.reset}`);
  console.log(`  ${c.green}agentmesh connect${c.reset} --key amk_xxx --role supplier --sub order:request`);
  console.log();
  console.log(`  ${c.dim}# List all topic mappings${c.reset}`);
  console.log(`  ${c.green}agentmesh topics${c.reset}`);
  console.log();
  console.log(`${c.dim}  Built by Hitazurana (HiroJei) at Tomeku Development${c.reset}`);
  console.log(`${c.dim}  https://tomeku.com  |  https://agentmesh.world${c.reset}`);
  console.log();
}

function printTopics() {
  console.log();
  console.log(`${c.bold}${c.cyan}  AgentMesh Event-to-Topic Mappings${c.reset}`);
  console.log(`${c.dim}  ──────────────────────────────────────────────${c.reset}`);
  console.log();

  const categories: Record<string, [string, string][]> = {};
  for (const [event, topic] of Object.entries(TOPIC_MAP)) {
    const cat = event.split(":")[0];
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push([event, topic]);
  }

  for (const [cat, entries] of Object.entries(categories)) {
    console.log(`  ${c.bold}${c.magenta}${cat.toUpperCase()}${c.reset}`);
    for (const [event, topic] of entries) {
      console.log(`    ${c.green}${event.padEnd(26)}${c.reset}${c.dim}-> ${c.reset}${topic}`);
    }
    console.log();
  }
}

function printInfo() {
  console.log(BANNER);
  console.log(`  ${c.bold}Package${c.reset}       @agentmeshworld/sdk`);
  console.log(`  ${c.bold}Version${c.reset}       0.1.0`);
  console.log(`  ${c.bold}Gateway${c.reset}       wss://agentmesh.world/ws/v1/agent`);
  console.log(`  ${c.bold}Protocol${c.reset}      WebSocket -> MQTT/BFT`);
  console.log(`  ${c.bold}Messages${c.reset}      22 typed message interfaces`);
  console.log(`  ${c.bold}Topics${c.reset}        ${Object.keys(TOPIC_MAP).length} event mappings`);
  console.log(`  ${c.bold}License${c.reset}       MIT`);
  console.log(`  ${c.bold}Author${c.reset}        Hitazurana (HiroJei) - Tomeku Development`);
  console.log(`  ${c.bold}Website${c.reset}       https://agentmesh.world`);
  console.log(`  ${c.bold}npm${c.reset}           https://www.npmjs.com/package/@agentmeshworld/sdk`);
  console.log(`  ${c.bold}GitHub${c.reset}        https://github.com/Tomeku-Development/AgentMesh-SDK`);
  console.log();
}

function timestamp(): string {
  return `${c.dim}${new Date().toISOString().slice(11, 19)}${c.reset}`;
}

async function connectCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      url: { type: "string", default: "wss://agentmesh.world/ws/v1/agent" },
      key: { type: "string" },
      role: { type: "string", default: "buyer" },
      caps: { type: "string", default: "" },
      sub: { type: "string", default: "" },
    },
    strict: false,
  });

  if (!values.key) {
    console.error(`${c.red}Error: --key is required (your amk_ API key)${c.reset}`);
    process.exit(1);
  }

  const url = values.url as string;
  const apiKey = values.key as string;
  const role = values.role as AgentRole;
  const capabilities = (values.caps as string).split(",").filter(Boolean);
  const subscribeTopics = (values.sub as string).split(",").filter(Boolean);

  console.log(BANNER);
  console.log(`${timestamp()} ${c.yellow}Connecting to mesh...${c.reset}`);
  console.log(`${timestamp()} ${c.dim}URL:  ${url}${c.reset}`);
  console.log(`${timestamp()} ${c.dim}Role: ${role}${c.reset}`);
  if (capabilities.length) {
    console.log(`${timestamp()} ${c.dim}Caps: ${capabilities.join(", ")}${c.reset}`);
  }
  console.log();

  const agent = new Agent({ url, apiKey, role, capabilities });

  agent.on("error", (err) => {
    console.error(`${timestamp()} ${c.red}ERROR${c.reset} ${err.message}`);
  });

  agent.on("reconnecting", ({ attempt, delay }) => {
    console.log(`${timestamp()} ${c.yellow}RECONNECTING${c.reset} attempt ${attempt}, next in ${delay}ms`);
  });

  agent.on("disconnected", ({ code, reason }) => {
    console.log(`${timestamp()} ${c.red}DISCONNECTED${c.reset} code=${code} reason=${reason}`);
  });

  try {
    const { agentId, workspace, workspaceId } = await agent.connect();
    console.log(`${timestamp()} ${c.green}${c.bold}CONNECTED${c.reset}`);
    console.log(`${timestamp()} ${c.dim}Agent ID:     ${c.reset}${c.cyan}${agentId}${c.reset}`);
    console.log(`${timestamp()} ${c.dim}Workspace:    ${c.reset}${workspace}`);
    console.log(`${timestamp()} ${c.dim}Workspace ID: ${c.reset}${workspaceId}`);
    console.log();

    // Subscribe
    if (subscribeTopics.length) {
      agent.subscribe(subscribeTopics);
      agent.on("subscribed", ({ topics }) => {
        console.log(`${timestamp()} ${c.blue}SUBSCRIBED${c.reset} ${topics.join(", ")}`);
      });
    }

    // Listen for messages
    agent.on("message", ({ topic, payload, header }) => {
      const senderId = (header as any)?.sender_id || "unknown";
      console.log(`${timestamp()} ${c.magenta}MSG${c.reset} ${c.cyan}${topic}${c.reset} ${c.dim}from=${senderId}${c.reset}`);
      console.log(`${c.dim}${JSON.stringify(payload, null, 2)}${c.reset}`);
      console.log();
    });

    // Interactive prompt for publishing
    console.log(`${c.dim}  Listening for messages... Press Ctrl+C to disconnect.${c.reset}`);
    console.log(`${c.dim}  Type a JSON line to publish: {"topic":"order:request","payload":{...}}${c.reset}`);
    console.log();

    // Read stdin for interactive publishing
    if (process.stdin.isTTY) {
      const readline = await import("node:readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      rl.on("line", (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const data = JSON.parse(trimmed);
          const topic = data.topic || data.t;
          const payload = data.payload || data.p || data;
          if (topic) {
            agent.publish(topic, payload);
            console.log(`${timestamp()} ${c.green}PUBLISHED${c.reset} ${topic}`);
          } else {
            console.log(`${c.yellow}Hint: {"topic":"order:request","payload":{...}}${c.reset}`);
          }
        } catch {
          console.log(`${c.red}Invalid JSON${c.reset}`);
        }
      });
    }

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      console.log();
      console.log(`${timestamp()} ${c.yellow}Disconnecting...${c.reset}`);
      agent.disconnect();
      console.log(`${timestamp()} ${c.green}Goodbye!${c.reset}`);
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});
  } catch (err: any) {
    console.error(`${c.red}Failed to connect: ${err.message}${c.reset}`);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "connect":
      await connectCommand(args.slice(1));
      break;
    case "topics":
      printTopics();
      break;
    case "info":
      printInfo();
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;
    default:
      console.error(`${c.red}Unknown command: ${command}${c.reset}`);
      console.log(`Run ${c.green}agentmesh help${c.reset} for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
