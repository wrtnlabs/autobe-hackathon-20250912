import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Refresh JWT tokens for an authenticated workflowManager user by verifying the
 * provided refresh token. On success, new access and refresh tokens are issued
 * to maintain secure and uninterrupted session access. This operation requires
 * a valid refresh token and is restricted to authenticated users only.
 *
 * @param props - Object containing workflowManager payload and refresh token
 *   request body
 * @returns Authorized workflowManager user session data with new tokens
 * @throws {Error} When token verification fails or user is not found or deleted
 */
export async function postauthWorkflowManagerRefresh(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowWorkflowManager.IRefresh;
}): Promise<INotificationWorkflowWorkflowManager.IAuthorized> {
  const { body } = props;

  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  let userId: string | undefined;
  if ("id" in decoded && typeof decoded.id === "string") userId = decoded.id;
  else if ("sub" in decoded && typeof decoded.sub === "string")
    userId = decoded.sub;
  if (!userId) throw new Error("User ID not found in token");

  const user =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findFirst({
      where: { id: userId, deleted_at: null },
    });

  if (!user) {
    throw new Error("User not found or deleted");
  }

  const nowIso = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    { id: user.id, type: "workflowManager" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "workflowManager", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: nowIso,
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
