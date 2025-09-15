import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Refresh JWT tokens for regularUser in recipe_sharing_regularusers
 *
 * This operation refreshes the access and refresh JWT tokens for an
 * authenticated regular user using a valid refresh token, maintaining session
 * continuity. It verifies the refresh token, and then issues new tokens with
 * expiry and refresh timestamps.
 *
 * @param props - Object containing the regularUser payload and the refresh
 *   token body
 * @param props.regularUser - Authenticated regularUser payload (unused here but
 *   exists for interface consistency)
 * @param props.body - Request body containing the refresh_token string
 * @returns The authorized regular user information along with newly generated
 *   tokens
 * @throws {Error} When the refresh token is invalid, expired, or the user does
 *   not exist
 */
export async function postauthRegularUserRefresh(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRegularUser.IRefresh;
}): Promise<IRecipeSharingRegularUser.IAuthorized> {
  const { body } = props;

  // Verify refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as unknown;

  // Validate decoded payload structure
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    typeof (decoded as any).id !== "string"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  const userId = (decoded as { id: string & tags.Format<"uuid"> }).id;

  // Fetch user from DB
  const user = await MyGlobal.prisma.recipe_sharing_regularusers.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Invalid or expired refresh token");
  }

  // Prepare expiration timestamps
  const now = new Date().getTime();
  const accessExpiresInMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const expiredAt = toISOStringSafe(new Date(now + accessExpiresInMs));
  const refreshableUntil = toISOStringSafe(new Date(now + refreshExpiresInMs));

  // Generate new access token with same payload
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.password_hash,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
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
    username: user.username,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
