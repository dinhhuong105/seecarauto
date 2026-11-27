import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { RedisService, RedisUnavailableError } from "./redis.service";

// CartStorageService (M02-02) — guest cart storage on Redis (G-03, API_SPEC §11.1).
//
// - Cart token: opaque high-entropy random UUID issued by the server. The
//   RAW token never appears in a Redis key or in any log — the key uses the
//   SHA-256 hash of the token, so a key listing or a log line cannot be
//   replayed as a cart token.
// - Storage shape (what M05 needs to implement the Cart API): cart =
//   { items: [{ itemId, productId, quantity, priceAtAdd, addedAt }],
//     createdAt, updatedAt }. `priceAtAdd` is informational only —
//   API_SPEC §11.1 requires the cart price to be the CURRENT catalogue
//   price; M05 must re-read prices from PostgreSQL at read/checkout time.
// - TTL: 30 days by default (API_SPEC §11.1), configurable via
//   REDIS_CART_TTL_DAYS; refreshed on every read and write.
// - Atomicity (FIX-02, Revision 02): add/update/remove run as an
//   optimistic-locking transaction — WATCH the cart key, read, mutate in
//   memory, MULTI/SET, EXEC — on a DEDICATED duplicate connection (so a
//   timed-out attempt can never leave a dangling WATCH on the shared
//   client). When EXEC aborts (key changed mid-transaction) the operation
//   retries on a fresh connection, up to 10 attempts. Without this, two
//   concurrent addItem calls could both read quantity 1 and both write 2
//   (lost update). A plain GET + SET is never used for mutations.
// - Redis down: every method throws RedisUnavailableError. The HTTP layer
//   (M05) maps it to a dependency error (503). We NEVER return a fake empty
//   cart — that would silently discard the customer's items. (DECIDED —
//   Henry approved 27/11/2026 per ChatGPT's FIX-04 proposal in the M02-02
//   review: Redis down → 503, never a fake empty cart. API_SPEC §11.1 was
//   updated to this decision; its old "temporary empty cart" note no
//   longer applies.)

export interface CartItem {
  itemId: string;
  productId: string;
  quantity: number;
  /** Catalogue price when the item was added (informational, see above). */
  priceAtAdd: number | null;
  addedAt: string;
}

export interface CartData {
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export class CartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartValidationError";
  }
}

const CART_KEY_PREFIX = "seecarauto:v1:cart";

/** Max WATCH/MULTI retries for one cart mutation under contention. */
const MAX_CART_TX_RETRIES = 10;

@Injectable()
export class CartStorageService {
  constructor(private readonly redis: RedisService) {}

  /** Issues a new opaque cart token (random UUID, high entropy). */
  createToken(): string {
    return randomUUID();
  }

  /** Redis key for a token — SHA-256 hash, never the raw token. */
  keyForToken(token: string): string {
    const hash = createHash("sha256").update(token).digest("hex");
    return `${CART_KEY_PREFIX}:${hash}`;
  }

  /** Reads a cart and refreshes its TTL. Returns null when it does not exist. */
  async getCart(token: string): Promise<CartData | null> {
    const key = this.keyForToken(token);
    const client = this.redis.getClient();
    const timeoutMs = this.redis.getConfig().commandTimeoutMs;
    let raw: string | null;
    try {
      raw = await this.redis.withTimeout(
        client.get(key),
        timeoutMs,
        "cart get",
      );
    } catch {
      throw new RedisUnavailableError("cart get");
    }
    if (raw === null) return null;
    try {
      await this.redis.withTimeout(
        client.expire(key, this.redis.getConfig().cartTtlSeconds),
        timeoutMs,
        "cart refresh ttl",
      );
    } catch {
      throw new RedisUnavailableError("cart get");
    }
    try {
      return JSON.parse(raw) as CartData;
    } catch {
      throw new CartValidationError("stored cart data is corrupt");
    }
  }

  /** Creates an empty cart for a token (or resets an existing one). */
  async createCart(token: string): Promise<CartData> {
    const now = new Date().toISOString();
    const cart: CartData = { items: [], createdAt: now, updatedAt: now };
    await this.saveCart(token, cart);
    return cart;
  }

  /** Adds an item (or increases quantity when the product is already in). */
  async addItem(
    token: string,
    input: { productId: string; quantity: number; priceAtAdd?: number },
  ): Promise<CartData> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new CartValidationError("quantity must be an integer >= 1");
    }
    const now = new Date().toISOString();
    return this.mutateCart(token, "add", (cart) => {
      const current: CartData = cart ?? {
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      const existing = current.items.find(
        (i) => i.productId === input.productId,
      );
      if (existing !== undefined) {
        existing.quantity += input.quantity;
        if (input.priceAtAdd !== undefined) {
          existing.priceAtAdd = input.priceAtAdd;
        }
      } else {
        current.items.push({
          itemId: randomUUID(),
          productId: input.productId,
          quantity: input.quantity,
          priceAtAdd: input.priceAtAdd ?? null,
          addedAt: now,
        });
      }
      current.updatedAt = now;
      return current;
    });
  }

  /** Sets the quantity of one item (quantity >= 1; use removeItem to delete). */
  async updateItem(
    token: string,
    itemId: string,
    quantity: number,
  ): Promise<CartData> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CartValidationError("quantity must be an integer >= 1");
    }
    const now = new Date().toISOString();
    return this.mutateCart(token, "update", (cart) => {
      if (cart === null) {
        throw new CartValidationError("cart does not exist");
      }
      const item = cart.items.find((i) => i.itemId === itemId);
      if (item === undefined) {
        throw new CartValidationError("cart item does not exist");
      }
      item.quantity = quantity;
      cart.updatedAt = now;
      return cart;
    });
  }

  /** Removes one item from the cart. */
  async removeItem(token: string, itemId: string): Promise<CartData> {
    const now = new Date().toISOString();
    return this.mutateCart(token, "remove", (cart) => {
      if (cart === null) {
        throw new CartValidationError("cart does not exist");
      }
      const index = cart.items.findIndex((i) => i.itemId === itemId);
      if (index === -1) {
        // API_SPEC §11.1: DELETE /cart/items/{itemId} on a missing item
        // must be 404 CART_ITEM_NOT_FOUND (mapped in M05 from
        // CartValidationError). FIX-05, Revision 03.
        throw new CartValidationError("cart item does not exist");
      }
      cart.items.splice(index, 1);
      cart.updatedAt = now;
      return cart;
    });
  }

  /** Deletes the whole cart. */
  async clearCart(token: string): Promise<void> {
    try {
      await this.redis.withTimeout(
        this.redis.getClient().del(this.keyForToken(token)),
        this.redis.getConfig().commandTimeoutMs,
        "cart clear",
      );
    } catch {
      throw new RedisUnavailableError("cart clear");
    }
  }

  /** Remaining TTL of a cart in seconds (-2 = no such cart, -1 = no expiry). */
  async getTtlSeconds(token: string): Promise<number> {
    try {
      return await this.redis.withTimeout(
        this.redis.getClient().ttl(this.keyForToken(token)),
        this.redis.getConfig().commandTimeoutMs,
        "cart ttl",
      );
    } catch {
      throw new RedisUnavailableError("cart ttl");
    }
  }

  /**
   * Runs one cart mutation as an optimistic-locking transaction (FIX-02).
   * `mutate` receives the current cart (null when it does not exist) and
   * returns the new cart state to store; it may throw CartValidationError
   * for domain errors, which is rethrown unchanged. When EXEC aborts
   * because another writer changed the key mid-transaction, the whole
   * attempt is retried on a fresh connection (up to MAX_CART_TX_RETRIES).
   * Redis failures surface as RedisUnavailableError.
   */
  private async mutateCart(
    token: string,
    operation: string,
    mutate: (cart: CartData | null) => CartData,
  ): Promise<CartData> {
    const key = this.keyForToken(token);
    const ttlSeconds = this.redis.getConfig().cartTtlSeconds;
    const timeoutMs = this.redis.getConfig().commandTimeoutMs;
    for (let attempt = 0; attempt < MAX_CART_TX_RETRIES; attempt++) {
      // A dedicated connection per attempt: a timed-out or aborted
      // transaction can never leak a WATCH onto the shared client.
      const txClient = this.redis.getClient().duplicate();
      try {
        const result = await this.redis.withTimeout(
          this.runTransaction(txClient, key, ttlSeconds, mutate),
          timeoutMs,
          `cart ${operation}`,
        );
        if (result !== null) return result;
        // EXEC aborted (watched key changed) — retry, with a small
        // backoff so contending writers do not spin on each other.
        await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
      } catch (error) {
        if (error instanceof CartValidationError) throw error;
        throw new RedisUnavailableError(`cart ${operation}`);
      } finally {
        txClient.disconnect();
      }
    }
    throw new RedisUnavailableError(
      `cart ${operation} (too many concurrent retries)`,
    );
  }

  /**
   * One WATCH → GET → mutate → MULTI/SET → EXEC round. Returns the new
   * cart when the transaction commits, null when EXEC aborted (caller
   * retries). Throws CartValidationError on corrupt stored data.
   */
  private async runTransaction(
    txClient: ReturnType<RedisService["getClient"]>,
    key: string,
    ttlSeconds: number,
    mutate: (cart: CartData | null) => CartData,
  ): Promise<CartData | null> {
    await txClient.watch(key);
    const raw = await txClient.get(key);
    let cart: CartData | null = null;
    if (raw !== null) {
      try {
        cart = JSON.parse(raw) as CartData;
      } catch {
        await txClient.unwatch();
        throw new CartValidationError("stored cart data is corrupt");
      }
    }
    const updated = mutate(cart);
    const multi = txClient.multi();
    multi.set(key, JSON.stringify(updated), "EX", ttlSeconds);
    const execResult = await multi.exec();
    if (execResult === null) return null;
    return updated;
  }

  private async saveCart(token: string, cart: CartData): Promise<void> {
    try {
      await this.redis.withTimeout(
        this.redis
          .getClient()
          .set(
            this.keyForToken(token),
            JSON.stringify(cart),
            "EX",
            this.redis.getConfig().cartTtlSeconds,
          ),
        this.redis.getConfig().commandTimeoutMs,
        "cart save",
      );
    } catch {
      throw new RedisUnavailableError("cart save");
    }
  }
}
