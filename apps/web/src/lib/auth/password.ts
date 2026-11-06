import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

// Same scheme as Maestro-virtual: Node's scrypt, no extra dependency.
// OWASP minimum parameters (~128 MB, ~200 ms). They are stored inside the hash
// so they can be raised later without invalidating existing passwords.
const COST = 2 ** 17;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 256 * 1024 * 1024;

// Format: scrypt$N$r$p$salt(base64)$hash(base64)
const PREFIX = "scrypt";

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

// Returns false for anything that is not a well-formed hash, including the
// "!" placeholder the seed uses for accounts that must not log in.
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, n, r, p, saltB64, keyB64] = parts;
  if (!saltB64 || !keyB64) return false;
  const N = Number(n);
  const blockSize = Number(r);
  const parallelization = Number(p);
  if (![N, blockSize, parallelization].every(Number.isSafeInteger))
    return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await deriveKey(password, salt, expected.length, {
      N,
      r: blockSize,
      p: parallelization,
      maxmem: MAX_MEMORY,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
