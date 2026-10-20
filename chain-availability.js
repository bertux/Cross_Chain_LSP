(function (root) {
  function hasBytecode(code) {
    if (typeof code !== "string") return false;
    return code.trim().toLowerCase() !== "0x";
  }

  async function getCodeWithFallback(chain, address, getCode) {
    if (typeof getCode !== "function") throw new TypeError("getCode must be a function");
    const rpcs = [...new Set([chain.rpc, ...(chain.rpcFallbacks || [])].filter(rpc => typeof rpc === "string" && rpc))];
    if (rpcs.length === 0) throw new TypeError("chain must have at least one RPC URL");

    const errors = [];
    for (const rpc of rpcs) {
      try {
        return await getCode(rpc, chain, address);
      } catch (error) {
        errors.push(`${rpc}: ${error?.message || error}`);
      }
    }
    throw new Error(`All ${rpcs.length} RPC endpoints failed (${errors.join("; ")})`);
  }

  async function classify(chains, addresses, getCode, concurrency = 4) {
    if (!Array.isArray(chains) || !Array.isArray(addresses) || addresses.length === 0) {
      throw new TypeError("chains and a non-empty address list are required");
    }
    if (typeof getCode !== "function") throw new TypeError("getCode must be a function");
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new TypeError("concurrency must be a positive integer");

    const results = new Array(chains.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < chains.length) {
        const index = nextIndex++;
        const chain = chains[index];
        try {
          const codes = await Promise.all(addresses.map(address => getCode(chain, address)));
          if (codes.some(code => typeof code !== "string")) throw new TypeError("getCode must return bytecode strings");
          results[index] = { chain, deployed: codes.every(hasBytecode) };
        } catch (error) {
          results[index] = { chain, error };
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, chains.length) }, worker));
    return results;
  }

  root.ChainAvailability = { classify, getCodeWithFallback };
})(globalThis);
