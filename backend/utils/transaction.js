import mongoose from "mongoose";

export const supportsMongoTransactions = async (db = mongoose.connection.db) => {
  if (!db) return false;

  try {
    const hello = await db.admin().command({ hello: 1 });
    return Boolean(hello?.setName || hello?.msg === "isdbgrid");
  } catch {
    return false;
  }
};

export const runMongoTransaction = async (session, operation) => {
  if (!session) return operation();

  if (!(await supportsMongoTransactions(session.client?.db ? session.client.db() : mongoose.connection.db))) {
    return operation();
  }

  return session.withTransaction(async () => {
    await operation();
  });
};
