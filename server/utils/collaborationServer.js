function createUnavailableWebSocketServer(error) {
  return {
    handleUpgrade(_request, socket) {
      const body = "Collaboration server unavailable";
      const response = [
        "HTTP/1.1 503 Service Unavailable",
        "Connection: close",
        "Content-Type: text/plain; charset=utf-8",
        `Content-Length: ${Buffer.byteLength(body)}`,
        "",
        body,
      ].join("\r\n");

      try {
        socket.write(response);
      } finally {
        socket.destroy();
      }
    },
    emit() {
      if (error) return;
    },
  };
}

function createCollaborationServer({
  loadServer = () => require("@hocuspocus/server"),
  serverOptions,
}) {
  try {
    const { Server } = loadServer();
    return {
      available: true,
      error: null,
      hocuspocus: new Server(serverOptions),
    };
  } catch (error) {
    return {
      available: false,
      error,
      hocuspocus: {
        webSocketServer: createUnavailableWebSocketServer(error),
      },
    };
  }
}

module.exports = {
  createCollaborationServer,
};
