import "../button-processing.js";

const withButtonDisabled = globalThis.withButtonDisabled;

Deno.test("disables the button until its async handler finishes", async () => {
  const button = { disabled: false };
  let finish;
  const handler = withButtonDisabled(button, () =>
    new Promise((resolve) => {
      finish = resolve;
    }));
  const pending = handler();

  if (!button.disabled) throw new Error("button was not disabled");
  finish();
  await pending;
  if (button.disabled) throw new Error("button was not reenabled");
});

Deno.test("ignores duplicate calls while the handler is pending", async () => {
  const button = { disabled: false };
  let finish;
  let calls = 0;
  const handler = withButtonDisabled(button, () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });

  const pending = handler();
  await handler();
  if (calls !== 1) throw new Error(`handler ran ${calls} times`);
  finish();
  await pending;
});

Deno.test("reenables the button when the handler rejects", async () => {
  const button = { disabled: false };
  const handler = withButtonDisabled(button, async () => {
    throw new Error("query failed");
  });

  let error;
  try {
    await handler();
  } catch (caught) {
    error = caught;
  }
  if (error?.message !== "query failed") {
    throw new Error("handler rejection was not propagated");
  }
  if (button.disabled) {
    throw new Error("button was not reenabled after rejection");
  }
});
