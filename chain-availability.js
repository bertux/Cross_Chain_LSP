(function (root) {
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
          results[index] = { chain, deployed: codes.every(code => code.toLowerCase() !== "0x") };
        } catch (error) {
          results[index] = { chain, error };
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, chains.length) }, worker));
    return results;
  }

  root.ChainAvailability = { classify };
})(globalThis);
