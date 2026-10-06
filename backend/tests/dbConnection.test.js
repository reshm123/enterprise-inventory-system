import { buildMongoConnectionUrl } from "../config/db.js";

describe("buildMongoConnectionUrl", () => {
  afterEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_REPLICA_SET;
    delete process.env.MONGODB_ALLOW_STANDALONE;
  });

  it("does not force a replica set for a standalone local MongoDB URL", () => {
    const url = buildMongoConnectionUrl("mongodb://127.0.0.1:27017/enterprise_inventory", {
      MONGODB_URI: "mongodb://127.0.0.1:27017/enterprise_inventory",
      MONGODB_ALLOW_STANDALONE: "true"
    });

    expect(url.searchParams.get("replicaSet")).toBeNull();
    expect(url.searchParams.get("directConnection")).toBe("true");
  });

  it("uses replicaSet only when it is explicitly configured", () => {
    const url = buildMongoConnectionUrl("mongodb://127.0.0.1:27017/enterprise_inventory", {
      MONGODB_URI: "mongodb://127.0.0.1:27017/enterprise_inventory",
      MONGODB_REPLICA_SET: "rs0"
    });

    expect(url.searchParams.get("replicaSet")).toBe("rs0");
  });
});
