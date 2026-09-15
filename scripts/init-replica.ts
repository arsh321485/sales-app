import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017/?directConnection=true";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const admin = client.db("admin");
  try {
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log("Replica set already initialized:", status.set);
  } catch {
    const result = await admin.command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: "127.0.0.1:27017" }],
      },
    });
    console.log("Replica set initiated:", result);
  }
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
