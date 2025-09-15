import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Refresh JWT tokens for a Technical Project Manager (TPM) user.
 *
 * Validates the provided refresh token, issues new access and refresh tokens
 * with the same payload structure as original authentication, and returns the
 * authorized user data including tokens.
 *
 * @param props - Object containing the request body with refresh token
 * @param props.body.refresh_token - JWT refresh token string
 * @returns Authorized TPM user data with new JWT tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the user associated with the token does not exist
 */
export async function postauthTpmRefresh(props: {
  body: ITaskManagementTpm.IRefresh;
}): Promise<ITaskManagementTpm.IAuthorized> {
  const { refresh_token } = props.body;

  // Verify and decode the provided refresh token
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string & tags.Format<"uuid"> };

  // Retrieve the TPM user associated with the token
  const user = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: decoded.id },
  });
  if (!user) throw new Error("User not found");

  // Use a consistent current timestamp
  const now = Date.now();

  // Construct payload for new access token
  const accessPayload = {
    id: user.id,
    type: "tpm",
  };

  // Generate new JWT access token
  const newAccessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate new JWT refresh token
  const newRefreshToken = jwt.sign(
    {
      id: user.id,
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Compute expiration timestamps for tokens
  const expiredAt = toISOStringSafe(new Date(now + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(now + 7 * 24 * 3600 * 1000),
  );

  // Return the authorized user data with new tokens
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
