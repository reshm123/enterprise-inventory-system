import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export const buildMongoConnectionUrl = (mongoUri = process.env.MONGODB_URI, env = process.env) => {
	if (!mongoUri) {
		throw new Error("MONGODB_URI is not set. Add it to backend/.env.");
	}

	const connectionUrl = new URL(mongoUri);
	connectionUrl.searchParams.set("retryWrites", "false");

	const replicaSet = env.MONGODB_REPLICA_SET?.trim();
	const allowStandalone = ["true", "1", "yes"].includes((env.MONGODB_ALLOW_STANDALONE || "").toLowerCase());

	if (replicaSet) {
		connectionUrl.searchParams.set("replicaSet", replicaSet);
		connectionUrl.searchParams.delete("directConnection");
		return connectionUrl;
	}

	if (allowStandalone) {
		connectionUrl.searchParams.delete("replicaSet");
		connectionUrl.searchParams.set("directConnection", "true");
		return connectionUrl;
	}

	connectionUrl.searchParams.delete("replicaSet");
	connectionUrl.searchParams.delete("directConnection");
	return connectionUrl;
};

export const connectdb = async () => {
	try {
		const mongoUri = process.env.MONGODB_URI;
		const connectionUrl = buildMongoConnectionUrl(mongoUri);
		const connect = await mongoose.connect(connectionUrl.toString());
		console.log(`mongodb is connected ${connect.connection.host}`);
	} catch (err) {
		console.log(err);
		throw err;
	}
};