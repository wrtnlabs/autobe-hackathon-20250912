import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Login a premium user by validating credentials stored in
 * `recipe_sharing_premiumusers`.
 *
 * Authenticates using email and password hash, generates JWT tokens for session
 * management. Returns authorized user details and tokens conforming to
 * IRecipeSharingPremiumUser.IAuthorized.
 *
 * @param props - Object containing login request body
 * @param props.body - Login credentials including email and password_hash
 * @returns The authorized premium user with JWT tokens
 * @throws {Error} When credentials are invalid or user is deleted
 */
export async function postauthPremiumUserLogin(props: {
  body: IRecipeSharingPremiumUser.ILogin;
}): Promise<IRecipeSharingPremiumUser.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.recipe_sharing_premiumusers.findFirst({
    where: { email: body.email, deleted_at: null },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Current time for token expirations
  const nowMillis = Date.now();

  // Expiry timestamps as ISO strings
  const accessExpiredAt = toISOStringSafe(new Date(nowMillis + 60 * 60 * 1000)); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(nowMillis + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    username: user.username,
    premium_since: toISOStringSafe(user.premium_since),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: jwt.sign(
        { id: user.id, type: "premiumuser" },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        { id: user.id, type: "premiumuser", tokenType: "refresh" },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
