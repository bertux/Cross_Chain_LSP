import "../implementation-check.js";

const check = globalThis.ImplementationCheck.check;

Deno.test("reports code presence independently for each implementation", async () => {
  const calls = [];
  const results = await check({
    getCode: async (address) => {
      calls.push(address);
      return address.endsWith("1") ? "0x6000" : "0x";
    },
  }, [
    { name: "LSP0", address: "0x0000000000000000000000000000000000000001" },
    { name: "Key Manager", address: "0x0000000000000000000000000000000000000002" },
  ]);

  if (calls.length !== 2) throw new Error(`queried ${calls.length} implementations`);
  if (results[0].deployed !== true) throw new Error("LSP0 bytecode was not detected");
  if (results[1].deployed !== false) throw new Error("missing Key Manager bytecode was not detected");
});

Deno.test("propagates RPC errors instead of reporting success", async () => {
  const checkPromise = check({
    getCode: async () => {
      throw new Error("RPC unavailable");
    },
  }, [{ name: "LSP0", address: "0x0000000000000000000000000000000000000001" }]);

  let error;
  try {
    await checkPromise;
  } catch (caught) {
    error = caught;
  }
  if (error?.message !== "RPC unavailable") throw new Error("RPC error was not propagated");
});
