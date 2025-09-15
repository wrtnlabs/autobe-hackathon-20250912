import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Refresh JWT tokens for the authenticated moderator user.
 *
 * This endpoint allows a moderator user to refresh their authentication tokens
 * using a valid refresh token. It verifies token validity, expiration, and
 * associated user permissions. Upon validation, it generates new JWT tokens for
 * the moderator to maintain an active session without re-login. Token refresh
 * operations are essential for security and usability in managing session
 * lifespan securely.
 *
 * @param props - Object containing the authenticated moderator payload and the
 *   refresh token in the request body.
 * @returns The updated moderator data along with new JWT access and refresh
 *   tokens.
 * @throws {Error} When the refresh token is invalid or expired.
 * @throws {Error} When the moderator is not found or inactive.
 */
export async function postauthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModerator.IRefresh;
}): Promise<IRecipeSharingModerator.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid refresh token");
  }

  if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
    throw new Error("Invalid token payload");
  }

  // We cannot use 'as' for type assertions here elsewhere, but for this narrow case a ts-expect-error is justified
  // to assure type safety because JWT decode returns unknown
  // @ts-expect-error
  const moderatorId: string & tags.Format<"uuid"> = decoded.id;

  const moderator = await MyGlobal.prisma.recipe_sharing_moderators.findFirst({
    where: { id: moderatorId, deleted_at: null },
  });

  if (!moderator) {
    throw new Error("Moderator not found or inactive");
  }

  const now = Date.now();
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now + 1000 * 60 * 60),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now + 1000 * 60 * 60 * 24 * 7),
  );

  const accessToken = jwt.sign(
    {
      id: moderator.id,
      email: moderator.email,
      password_hash: moderator.password_hash,
      username: moderator.username,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: moderator.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: moderator.id,
    email: moderator.email as string & tags.Format<"email">,
    password_hash: moderator.password_hash,
    username: moderator.username,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
