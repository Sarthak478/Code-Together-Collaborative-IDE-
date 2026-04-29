const Y = require("yjs");
const { HocuspocusProvider } = require("@hocuspocus/provider");

async function testSync() {
  console.log("Starting Sync test...");

  // Client A
  const ydocA = new Y.Doc();
  const providerA = new HocuspocusProvider({
    url: "ws://localhost:1235",
    name: "test-room-debug",
    document: ydocA,
  });

  // Client B
  const ydocB = new Y.Doc();
  const providerB = new HocuspocusProvider({
    url: "ws://localhost:1235",
    name: "test-room-debug",
    document: ydocB,
  });

  await new Promise(resolve => setTimeout(resolve, 1000)); // wait for connection

  if (providerA.status !== "connected" || providerB.status !== "connected") {
    console.log("ERROR: Providers failed to connect", providerA.status, providerB.status);
    process.exit(1);
  }

  console.log("Both connected.");

  const textA = ydocA.getText("codemirror");
  const textB = ydocB.getText("codemirror");

  // A types
  console.log("A is inserting text...");
  textA.insert(0, "Hello from A!");

  // Wait for sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("Text in B after A typed:", textB.toString());

  // B types
  console.log("B is inserting text...");
  textB.insert(textB.length, " And B!");

  // Wait for sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("Text in A after B typed:", textA.toString());
  
  providerA.destroy();
  providerB.destroy();
  console.log("Test finished.");
  process.exit(0);
}

testSync();
