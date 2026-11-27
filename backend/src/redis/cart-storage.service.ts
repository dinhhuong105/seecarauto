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
// - Redis down: every method throws RedisUnavailableError. The HTTP layer
//   (M05) maps it to a dependency error (503). We NEVER return a fake empty
//   cart — that would silently discard the customer's items. (Note: this
//   differs from the API_SPEC §11.1 fallback note "giỏ rỗng tạm thời";
//   recorded as ISSUE-M02-02-01 in the Task Brief for ChatGPT to decide.)

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
    const cart = (await this.getCart(token)) ?? (await this.createCart(token));
    const existing = cart.items.find((i) => i.productId === input.productId);
    if (existing !== undefined) {
      existing.quantity += input.quantity;
      if (input.priceAtAdd !== undefined) {
        existing.priceAtAdd = input.priceAtAdd;
      }
    } else {
      cart.items.push({
        itemId: randomUUID(),
        productId: input.productId,
        quantity: input.quantity,
        priceAtAdd: input.priceAtAdd ?? null,
        addedAt: new Date().toISOString(),
      });
    }
    cart.updatedAt = new Date().toISOString();
    await this.saveCart(token, cart);
    return cart;
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
    const cart = await this.getCart(token);
    if (cart === null) {
      throw new CartValidationError("cart does not exist");
    }
    const item = cart.items.find((i) => i.itemId === itemId);
    if (item === undefined) {
      throw new CartValidationError("cart item does not exist");
    }
    item.quantity = quantity;
    cart.updatedAt = new Date().toISOString();
    await this.saveCart(token, cart);
    return cart;
  }

  /** Removes one item from the cart. */
  async removeItem(token: string, itemId: string): Promise<CartData> {
    const cart = await this.getCart(token);
    if (cart === null) {
      throw new CartValidationError("cart does not exist");
    }
    cart.items = cart.items.filter((i) => i.itemId !== itemId);
    cart.updatedAt = new Date().toISOString();
    await this.saveCart(token, cart);
    return cart;
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
