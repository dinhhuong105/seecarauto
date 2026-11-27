import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

// Password hashing with Argon2id (M02-05, NFR-006, API_SECURITY §1).
// Parameters are the OWASP recommendation decided in D-07:
// memory 19 MiB, iterations 2, parallelism 1, hash length 32 bytes.
// The encoded hash string carries its own parameters, so `verify` needs
// no configuration — it reads them from the hash itself.

export const ARGON2_MEMORY_KIB = 19 * 1024;
export const ARGON2_TIME_COST = 2;
export const ARGON2_PARALLELISM = 1;
export const ARGON2_HASH_LENGTH = 32;

/**
 * Fixed dummy Argon2id hash (D-13, timing mitigation). When the username
 * does not exist, login still runs a real Argon2id verify against this
 * hash so the response time does not reveal whether the account exists.
 * This is an encoded hash of a random password nobody knows — it is NOT
 * a credential and cannot be used to log in (verify always returns false
 * for any real password). Generated once with the same OWASP parameters.
 */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$OLWCc46tUlpRJk5SR71WbA$W9YOTRd5EmoMWu+c6CGCwnmg4x4WtOrBKAOFjxx/2UI";

@Injectable()
export class PasswordService {
  /** Hashes a plaintext password with Argon2id (OWASP parameters, D-07). */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_KIB,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
      hashLength: ARGON2_HASH_LENGTH,
    });
  }

  /**
   * Verifies a plaintext password against an encoded Argon2id hash.
   * Returns false (never throws) for a mismatched or malformed hash.
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Runs a real verify against the fixed dummy hash (D-13). */
  async verifyDummy(password: string): Promise<boolean> {
    return this.verify(DUMMY_PASSWORD_HASH, password);
  }
}
