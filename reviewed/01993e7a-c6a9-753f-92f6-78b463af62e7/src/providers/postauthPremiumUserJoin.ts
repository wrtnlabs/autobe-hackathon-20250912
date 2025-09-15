import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Register a new premium user account.
 *
 * This operation handles registration by validating uniqueness of email and
 * username, hashing password externally (already hashed on input), setting
 * subscription activation timestamp, and returning authorization tokens for
 * session management.
 *
 * @param props - Object containing registration request data.
 * @param props.body - Registration data including email, hashed password, and
 *   username.
 * @returns Authorized premium user data with JWT tokens.
 * @throws {Error} If email or username is already in use.
 */
export async function postauthPremiumUserJoin(props: {
  body: IRecipeSharingPremiumUser.ICreate;
}): Promise<IRecipeSharingPremiumUser.IAuthorized> {
  const { email, password_hash, username } = props.body;

  // Check for duplicate email or username
  const existingUser =
    await MyGlobal.prisma.recipe_sharing_premiumusers.findFirst({
      where: {
        OR: [{ email }, { username }],
        deleted_at: null,
      },
    });
  if (existingUser) {
    throw new Error("Email or username already in use");
  }

  // Generate unique ID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new premium user record
  const created = await MyGlobal.prisma.recipe_sharing_premiumusers.create({
    data: {
      id,
      email,
      password_hash,
      username,
      premium_since: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Calculate token expiration dates
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  // Generate JWT tokens
  const accessToken = jwt.sign(
    { id: created.id, type: "premiumuser", email: created.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Return authorized user details
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    username: created.username,
    premium_since: created.premium_since as unknown as string &
      tags.Format<"date-time">,
    created_at: created.created_at as unknown as string &
      tags.Format<"date-time">,
    updated_at: created.updated_at as unknown as string &
      tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (created.deleted_at as unknown as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
