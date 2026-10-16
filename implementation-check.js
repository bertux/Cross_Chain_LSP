(function (root) {
  async function check(provider, implementations) {
    return Promise.all(implementations.map(async ({ name, address }) => ({
      name,
      address,
      deployed: (await provider.getCode(address)).toLowerCase() !== "0x",
    })));
  }

  root.ImplementationCheck = { check };
})(globalThis);
