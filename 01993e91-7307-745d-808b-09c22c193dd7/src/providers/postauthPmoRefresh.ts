import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Refresh JWT tokens for a logged-in Project Management Officer (PMO) user
 * using a valid refresh token.
 *
 * Validates the refresh token, verifies user existence, and issues new access
 * and refresh tokens.
 *
 * @param props - Object containing the PMO payload and request body with
 *   refresh token.
 * @param props.pmo - The authenticated PMO user payload (not used directly in
 *   this function).
 * @param props.body - Object containing the refresh token string.
 * @returns The authorized PMO user object including new tokens and expiration
 *   info.
 * @throws {Error} Throws when the refresh token is invalid, expired, or user
 *   not found.
 */
export async function postauthPmoRefresh(props: {
  pmo: PmoPayload;
  body: ITaskManagementPmo.IRefresh;
}): Promise<ITaskManagementPmo.IAuthorized> {
  const { body } = props;

  // Verify and decode refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string & tags.Format<"uuid">; type: string };

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  // Fetch user from database
  const user = await MyGlobal.prisma.task_management_pmo.findFirst({
    where: { id: decoded.id, deleted_at: null },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate tokens
  const accessTokenExpiresIn = "1h";
  const refreshTokenExpiresIn = "7d";

  const accessToken = jwt.sign(
    { id: user.id, type: "pmo" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: accessTokenExpiresIn },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: refreshTokenExpiresIn },
  );

  // Calculate expiration timestamps as ISO strings
  // Access token expires in 1 hour
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  );

  // Refresh token expires in 7 days
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
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
