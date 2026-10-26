// db.types.ts

export type DbTimestamp = string;

export type DbUser = {
  id: string; // UUID
  email: string;
  password_hash: string;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type DbRefreshToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: DbTimestamp;
  created_at: DbTimestamp;
  revoked_at: DbTimestamp | null;
  user_agent: string | null;
  ip_address: string | null;
};

export type DbRefreshTokenWithUser = {
  user?: DbUser;
} & DbRefreshToken;

export type DbApiKey = {
  id: string;
  name: string;
  hash: string;
  mask: string;
  user_id: string;
  prefix: string;
  is_active: boolean;
  last_used_at: DbTimestamp | null;
  expires_at: DbTimestamp | null;
  created_at: DbTimestamp;
};

export type DbApiKeyWithUser = {
  user?: DbUser;
} & DbApiKey;

// Projects
export type DbProject = {
  id: string;
  user_id: string;
  name: string;
  source_url: string;
};
