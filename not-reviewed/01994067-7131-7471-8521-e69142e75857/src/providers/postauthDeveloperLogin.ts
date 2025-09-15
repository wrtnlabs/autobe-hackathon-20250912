import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * Login for developer user according to oauth_server_developers table
 * credentials.
 *
 * Authenticates a developer by verifying email and password. On success,
 * returns developer info along with JWT access and refresh tokens. Publicly
 * accessible endpoint with login authorization.
 *
 * @param props - Object containing the login credentials.
 * @param props.body - Login credentials including email and password.
 * @returns Authorized developer data and tokens.
 * @throws {Error} Throws if email not found or password is invalid.
 */
export async function postauthDeveloperLogin(props: {
  body: IOauthServerDeveloper.ILogin;
}): Promise<IOauthServerDeveloper.IAuthorized> {
  const { email, password } = props.body;

  const user = await MyGlobal.prisma.oauth_server_developers.findFirstOrThrow({
    where: { email, deleted_at: null },
  });

  const isValid = await MyGlobal.password.verify(password, user.password_hash);

  if (!isValid) throw new Error("Invalid credentials");

  const now = Date.now();
  const accessTokenExpiry = now + 3600 * 1000; // 1 hour
  const refreshTokenExpiry = now + 7 * 24 * 3600 * 1000; // 7 days

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      type: "developer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
