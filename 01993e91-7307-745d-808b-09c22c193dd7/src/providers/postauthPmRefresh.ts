import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Refresh JWT authorization tokens for authenticated Project Manager user using
 * a valid refresh token.
 *
 * This operation validates the provided refresh token, ensures the Project
 * Manager user exists and is active (not soft deleted), and issues new access
 * and refresh tokens. This allows clients to maintain authorized sessions
 * without requiring full re-login.
 *
 * @param props - Object containing the authenticated PM user info and request
 *   body
 * @param props.pm - The authenticated Project Manager payload
 * @param props.body - Request body containing the refresh token string
 * @returns New authorization tokens along with user info
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the user is not found or inactive
 */
export async function postauthPmRefresh(props: {
  pm: PmPayload;
  body: ITaskManagementPm.IRefresh;
}): Promise<ITaskManagementPm.IAuthorized> {
  const { body } = props;

  let decodedRefreshToken: { id: string & tags.Format<"uuid">; type: "pm" };
  try {
    decodedRefreshToken = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as unknown as { id: string & tags.Format<"uuid">; type: "pm" };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const pmUser = await MyGlobal.prisma.task_management_pm.findFirst({
    where: {
      id: decodedRefreshToken.id,
      deleted_at: null,
    },
  });

  if (!pmUser) {
    throw new Error("User not found or inactive");
  }

  const accessToken = jwt.sign(
    { id: pmUser.id, type: "pm" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: pmUser.id, type: "pm", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const createdAt = toISOStringSafe(pmUser.created_at);
  const updatedAt = toISOStringSafe(pmUser.updated_at);
  const deletedAt = pmUser.deleted_at
    ? toISOStringSafe(pmUser.deleted_at)
    : null;

  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 3600 * 1000);
  const refreshExpiredAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  return {
    id: pmUser.id,
    email: pmUser.email,
    password_hash: pmUser.password_hash,
    name: pmUser.name,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshExpiredAt),
    },
  };
}
