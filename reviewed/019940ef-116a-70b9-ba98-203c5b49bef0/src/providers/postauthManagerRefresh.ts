import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Refresh JWT tokens for manager role using a valid refresh token.
 *
 * This function verifies the provided refresh token, ensures it belongs to a
 * valid manager who is not soft-deleted, and issues new access and refresh
 * tokens. It returns the manager's authorization information including the
 * refreshed tokens.
 *
 * @param props - Object containing the manager identity and refresh token body.
 * @param props.manager - Authenticated manager payload (not used for auth
 *   here).
 * @param props.body - Body containing the refresh token string.
 * @returns The manager authorization data along with new JWT tokens.
 * @throws {Error} If the refresh token is invalid, expired, or does not belong
 *   to a manager.
 * @throws {Error} If the manager does not exist or is soft-deleted.
 */
export async function postauthManagerRefresh(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManager.IRefresh;
}): Promise<IJobPerformanceEvalManager.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string; type: string };

  if (decoded.type !== "manager") {
    throw new Error("Invalid token: not a manager token");
  }

  // Step 2: Retrieve the manager record from the database
  const manager = await MyGlobal.prisma.job_performance_eval_managers.findFirst(
    {
      where: {
        id: decoded.id,
        deleted_at: null,
      },
    },
  );

  if (!manager) throw new Error("Manager not found or deleted");

  // Step 3: Generate new JWT tokens
  const accessTokenPayload = {
    id: manager.id,
    email: manager.email,
    name: manager.name,
    type: "manager",
  };

  const newAccessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: manager.id,
    tokenType: "refresh",
  };

  const newRefreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 4: Compute expiration timestamps as ISO strings
  const accessTokenExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 3600 * 1000));

  const refreshTokenExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 3600 * 1000));

  // Step 5: Return the full authorization response object
  return {
    id: manager.id,
    email: manager.email,
    password_hash: manager.password_hash,
    name: manager.name,
    created_at: toISOStringSafe(manager.created_at),
    updated_at: toISOStringSafe(manager.updated_at),
    deleted_at: manager.deleted_at ? toISOStringSafe(manager.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
