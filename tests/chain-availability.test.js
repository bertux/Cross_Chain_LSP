import "../chain-availability.js";

const classify = globalThis.ChainAvailability.classify;
const getCodeWithFallback = globalThis.ChainAvailability.getCodeWithFallback;

Deno.test("classifies chains by whether every requested implementation is deployed", async () => {
  const chains = [{ key: "ready" }, { key: "partial" }, { key: "missing" }];
  const results = await classify(chains, ["primary", "secondary"], async (chain, address) => {
    if (chain.key === "missing" && address === "primary") return "0x";
    if (chain.key === "partial" && address === "secondary") return "0x";
    return "0x6000";
  });

  if (results[0].deployed !== true) throw new Error("fully deployed chain was not classified as available");
  if (results[1].deployed !== false) throw new Error("chain missing one implementation was classified as available");
  if (results[2].deployed !== false) throw new Error("chain missing both implementations was classified as available");
});

Deno.test("treats blank or zero bytecode as not deployed and non-zero bytecode as deployed", async () => {
  const results = await classify([{ key: "empty" }, { key: "code" }, { key: "spaces" }], ["implementation"], async (chain) => {
    if (chain.key === "empty") return "0x";
    if (chain.key === "code") return "0x6000";
    return " 0x ";
  });

  if (results[0].deployed !== false) throw new Error("zero bytecode should not be considered deployed");
  if (results[1].deployed !== true) throw new Error("non-zero bytecode should be considered deployed");
  if (results[2].deployed !== false) throw new Error("whitespace-wrapped zero bytecode should not be considered deployed");
});

Deno.test("reports RPC failures without classifying the chain as deployed", async () => {
  const results = await classify([{ key: "unavailable" }], ["implementation"], async () => {
    throw new Error("RPC unavailable");
  });

  if (results[0].error?.message !== "RPC unavailable") throw new Error("RPC failure was not surfaced");
});

Deno.test("tries chain RPC fallbacks after an endpoint error", async () => {
  const tried = [];
  const code = await getCodeWithFallback({
    rpc: "https://primary.example",
    rpcFallbacks: ["https://fallback.example", "https://fallback.example"],
  }, "0x1234", async (rpc, _chain, address) => {
    tried.push(rpc);
    if (rpc === "https://primary.example") throw new Error("primary unavailable");
    return `${address}:0x6000`;
  });

  if (tried.join(",") !== "https://primary.example,https://fallback.example") {
    throw new Error(`unexpected RPC fallback order: ${tried.join(",")}`);
  }
  if (code !== "0x1234:0x6000") throw new Error("fallback result was not returned");
});

Deno.test("reports all RPC endpoint errors when every fallback fails", async () => {
  let message = "";
  try {
    await getCodeWithFallback({ rpc: "https://primary.example", rpcFallbacks: ["https://fallback.example"] }, "0x1234", async (rpc) => {
      throw new Error(`${rpc} unavailable`);
    });
  } catch (error) {
    message = error.message;
  }

  if (!message.includes("https://primary.example: https://primary.example unavailable")) {
    throw new Error("primary RPC error was not included");
  }
  if (!message.includes("https://fallback.example: https://fallback.example unavailable")) {
    throw new Error("fallback RPC error was not included");
  }
});

Deno.test("limits concurrent chain checks", async () => {
  let active = 0;
  let peak = 0;
  await classify(Array.from({ length: 6 }, (_, i) => ({ key: String(i) })), ["implementation"], async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    return "0x";
  }, 2);

  if (peak !== 2) throw new Error(`expected at most 2 concurrent checks, saw ${peak}`);
});
