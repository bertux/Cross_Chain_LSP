import "../chain-availability.js";

const classify = globalThis.ChainAvailability.classify;

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

Deno.test("reports RPC failures without classifying the chain as deployed", async () => {
  const results = await classify([{ key: "unavailable" }], ["implementation"], async () => {
    throw new Error("RPC unavailable");
  });

  if (results[0].error?.message !== "RPC unavailable") throw new Error("RPC failure was not surfaced");
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
