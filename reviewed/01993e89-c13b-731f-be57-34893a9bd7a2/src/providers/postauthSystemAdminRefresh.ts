import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Refresh JWT tokens for system administrator sessions.
 *
 * This endpoint accepts a valid refresh token and issues new access and refresh
 * tokens to maintain secure session continuity. It verifies the refresh token,
 * checks the user session state, and returns authorized session information
 * including new tokens.
 *
 * @param props - Object containing systemAdmin payload and request body with
 *   refresh token
 * @param props.systemAdmin - Authenticated systemAdmin payload (not used
 *   directly)
 * @param props.body - Request body containing the refresh token string
 * @returns Authorized session information including updated tokens
 * @throws {Error} When refresh token is invalid or expired
 * @throws {Error} When token type is not systemAdmin
 * @throws {Error} When system administrator is not found or deleted
 */
export async function postauthSystemAdminRefresh(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowSystemAdmin.IRequestRefresh;
}): Promise<INotificationWorkflowSystemAdmin.IAuthorized> {
  const { body } = props;

  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string; type: string };

  if (decoded.type !== "systemAdmin") {
    throw new Error("Invalid token type");
  }

  const admin =
    await MyGlobal.prisma.notification_workflow_systemadmins.findUnique({
      where: { id: decoded.id },
    });

  if (!admin || admin.deleted_at !== null) {
    throw new Error("System Administrator not found or deleted");
  }

  const now = toISOStringSafe(new Date());

  const accessTokenPayload = {
    id: admin.id,
    email: admin.email,
    type: "systemAdmin" as const,
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: admin.id,
    tokenType: "refresh",
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: now,
    },
  };
}
