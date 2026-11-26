// Jest e2e setup (M02-01): point every e2e spec at the TEST database.
// backend/.env.test is gitignored and holds only the local dev-only credentials
// (same defaults as .env.example). Never point e2e tests at the dev database.
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.test"), quiet: true });
