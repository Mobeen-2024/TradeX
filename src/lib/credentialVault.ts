/**
 * credentialVault.ts — Server-side only
 *
 * Secure AES-256-GCM encrypted credential vault for multi-account API key management.
 * Keys are NEVER stored in plaintext. The vault master password is sourced exclusively
 * from environment variables — never from user input at runtime.
 *
 * Storage backend: Redis (HSET tradex:vault:accounts)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { redis } from './redis.js';

// ── Constants ─────────────────────────────────────────────────────
const VAULT_KEY_HEX = process.env.VAULT_MASTER_KEY ?? '';
const REDIS_KEY     = 'tradex:vault:accounts';
const ALGORITHM     = 'aes-256-gcm';

// Derive a 32-byte key from the env variable (hex or raw)
function getMasterKey(): Buffer {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!VAULT_KEY_HEX) {
    if (isProd) {
      throw new Error('[Vault] CRITICAL: VAULT_MASTER_KEY must be set in production to prevent data loss!');
    }
    // Stable dev key derived from environment/path to survive restarts but not be plaintext
    const devSeed = `${process.cwd()}-${process.env.COMPUTERNAME || 'dev-host'}`;
    console.warn('[Vault] VAULT_MASTER_KEY not set. Using stable dev seed — credentials will survive local restarts.');
    return createHmac('sha256', 'tradex-dev-secret').update(devSeed).digest();
  }
  
  const buf = Buffer.from(VAULT_KEY_HEX, 'hex');
  if (buf.length !== 32) throw new Error('[Vault] VAULT_MASTER_KEY must be 64 hex chars (32 bytes).');
  return buf;
}

const masterKey = getMasterKey();

// ── Types ─────────────────────────────────────────────────────────
export type AccountPermission = 'read' | 'trade' | 'withdraw';
export type AccountStatus     = 'active' | 'suspended' | 'error';
export type ExchangeType      = 'binance_spot' | 'binance_futures' | 'bybit' | 'okx';

export interface ExchangeCredential {
  apiKey:    string;
  apiSecret: string;
  passphrase?: string; // OKX requires this
}

export interface ManagedAccount {
  id:          string;
  label:       string;
  exchange:    ExchangeType;
  subAccount?: string;            // Exchange sub-account label
  permissions: AccountPermission[];
  status:      AccountStatus;
  createdAt:   number;
  lastUsed?:   number;
  // Encrypted blobs — credentials stored as ciphertext
  encryptedCredentials: string;
  authTag:              string;
  iv:                   string;
  // Non-sensitive metadata
  equity?:     number;
  drawdown?:   number;
  pnl24h?:     number;
}

// ── Encryption ────────────────────────────────────────────────────
function encrypt(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString('base64'),
    iv:         iv.toString('base64'),
    authTag:    tag.toString('base64'),
  };
}

function decrypt(ciphertext: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGORITHM, masterKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

// ── HMAC fingerprint for API key identity check ───────────────────
function fingerprintApiKey(apiKey: string): string {
  return createHmac('sha256', masterKey).update(apiKey).digest('hex').slice(0, 16);
}

// ── Vault CRUD ────────────────────────────────────────────────────
export const credentialVault = {

  async addAccount(
    label: string,
    exchange: ExchangeType,
    credentials: ExchangeCredential,
    permissions: AccountPermission[] = ['read', 'trade'],
    subAccount?: string,
  ): Promise<ManagedAccount> {
    const id = `acct_${randomBytes(6).toString('hex')}`;
    const { ciphertext, iv, authTag } = encrypt(JSON.stringify(credentials));

    const account: ManagedAccount = {
      id,
      label,
      exchange,
      subAccount,
      permissions,
      status:               'active',
      createdAt:            Date.now(),
      encryptedCredentials: ciphertext,
      authTag,
      iv,
    };

    await redis.hset(REDIS_KEY, id, JSON.stringify(account));
    console.log(`[Vault] Account added: ${label} (${id}) fingerprint=${fingerprintApiKey(credentials.apiKey)}`);
    return account;
  },

  async getAccount(id: string): Promise<ManagedAccount | null> {
    const raw = await redis.hget(REDIS_KEY, id);
    if (!raw) return null;
    return JSON.parse(raw);
  },

  async listAccounts(): Promise<Omit<ManagedAccount, 'encryptedCredentials' | 'authTag' | 'iv'>[]> {
    const raw = await redis.hgetall(REDIS_KEY);
    return Object.values(raw).map(v => {
      const acct: ManagedAccount = JSON.parse(v);
      // Strip encrypted blobs from the public listing
      const { encryptedCredentials, authTag, iv, ...safe } = acct;
      return safe;
    });
  },

  async decryptCredentials(id: string): Promise<ExchangeCredential | null> {
    const acct = await this.getAccount(id);
    if (!acct) return null;
    try {
      const plain = decrypt(acct.encryptedCredentials, acct.iv, acct.authTag);
      // Update lastUsed timestamp
      await redis.hset(REDIS_KEY, id, JSON.stringify({ ...acct, lastUsed: Date.now() }));
      return JSON.parse(plain);
    } catch (e) {
      console.error(`[Vault] Decryption failed for ${id}:`, e);
      await redis.hset(REDIS_KEY, id, JSON.stringify({ ...acct, status: 'error' }));
      return null;
    }
  },

  async updateStatus(id: string, status: AccountStatus): Promise<void> {
    const acct = await this.getAccount(id);
    if (!acct) return;
    await redis.hset(REDIS_KEY, id, JSON.stringify({ ...acct, status }));
  },

  async updateMetrics(id: string, metrics: { equity?: number; drawdown?: number; pnl24h?: number }): Promise<void> {
    const acct = await this.getAccount(id);
    if (!acct) return;
    await redis.hset(REDIS_KEY, id, JSON.stringify({ ...acct, ...metrics }));
  },

  async removeAccount(id: string): Promise<void> {
    await redis.hdel(REDIS_KEY, id);
    console.log(`[Vault] Account removed: ${id}`);
  },
};
