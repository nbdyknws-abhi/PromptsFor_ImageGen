import { Client, Account, Databases, Storage, ID, Avatars } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const ID_HELPER = ID; // use ID_HELPER.unique() when needed
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

export {
  client,
  account,
  databases,
  storage,
  avatars,
  ID_HELPER,
  BUCKET_ID,
  DATABASE_ID,
  COLLECTION_ID,
  APPWRITE_ENDPOINT,
};
