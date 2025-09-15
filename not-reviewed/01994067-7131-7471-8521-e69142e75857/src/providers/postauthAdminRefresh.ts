import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Refreshes authentication tokens for admin users maintaining session
 * continuity.
 *
 * This endpoint validates the provided refresh token string. If valid, it
 * retrieves the corresponding admin user from the database
 * (oauth_server_admins), ensuring the user is not soft deleted. It then
 * generates new JWT access and refresh tokens, returning the admin user
 * information alongside the new tokens.
 *
 * All date and datetime fields are represented as ISO 8601 strings with proper
 * branding.
 *
 * @param props - Object containing the authenticated admin payload and the
 *   request body.
 * @param props.admin - The authenticated admin user payload (not used for
 *   validation).
 * @param props.body - Request body containing the refresh token string.
 * @returns A promise resolving to the authorized admin user information and new
 *   tokens.
 * @throws {Error} If the refresh token is invalid, expired, or if the admin
 *   user is not found or soft deleted.
 */
export async function postauthAdminRefresh(props: {
  admin: AdminPayload;
  body: IOauthServerAdmin.IRefresh;
}): Promise<IOauthServerAdmin.IAuthorized> {
  const { body } = props;

  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });

  if (!decoded || typeof decoded !== "object" || !("id" in decoded)) {
    throw new Error("Invalid refresh token");
  }

  const user = await MyGlobal.prisma.oauth_server_admins.findUnique({
    where: { id: decoded.id },
  });

  if (!user || user.deleted_at !== null) {
    throw new Error("Admin user not found or deleted");
  }

  const accessTokenPayload = {
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id, token_type: "refresh" },
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
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
