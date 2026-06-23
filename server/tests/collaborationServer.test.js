const test = require("node:test");
const assert = require("node:assert/strict");

const { createCollaborationServer } = require("../utils/collaborationServer");

test("createCollaborationServer falls back instead of crashing when dependency load fails", () => {
  const collaboration = createCollaborationServer({
    loadServer: () => {
      throw new Error("Cannot find module '@hocuspocus/server'");
    },
    serverOptions: {},
  });

  assert.equal(collaboration.available, false);
  assert.match(collaboration.error.message, /Cannot find module/);
  assert.ok(collaboration.hocuspocus);
  assert.ok(collaboration.hocuspocus.webSocketServer);
  assert.equal(typeof collaboration.hocuspocus.webSocketServer.handleUpgrade, "function");
});

test("fallback collaboration server closes upgrades with a 503 response", () => {
  const collaboration = createCollaborationServer({
    loadServer: () => {
      throw new Error("Cannot find module '@hocuspocus/server'");
    },
    serverOptions: {},
  });

  let written = "";
  let destroyed = false;
  const socket = {
    write(value) {
      written += value;
    },
    destroy() {
      destroyed = true;
    },
  };

  collaboration.hocuspocus.webSocketServer.handleUpgrade({ url: "/" }, socket, null, () => {});

  assert.match(written, /503 Service Unavailable/);
  assert.match(written, /Collaboration server unavailable/);
  assert.equal(destroyed, true);
});
