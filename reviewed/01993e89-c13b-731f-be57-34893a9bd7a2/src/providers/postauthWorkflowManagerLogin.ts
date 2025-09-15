import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Authenticate a workflowManager user by verifying provided credentials.
 *
 * This endpoint is public and validates email and password against the
 * notification_workflow_workflowmanagers table. On success, it issues JWT
 * access and refresh tokens with specified expiration. Date/datetime types are
 * handled as ISO 8601 strings with required branding.
 *
 * @param props - Object containing the login credentials.
 * @param props.body - The login credentials including email and password.
 * @returns Authorized workflowManager user data with authentication token.
 * @throws {Error} If the credentials are invalid or user is deleted.
 */
export async function postauthWorkflowManagerLogin(props: {
  body: INotificationWorkflowWorkflowManager.ILogin;
}): Promise<INotificationWorkflowWorkflowManager.IAuthorized> {
  const { body } = props;

  const user =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUnique({
      where: { email: body.email },
    });

  if (!user || user.deleted_at !== null) {
    throw new Error("Invalid credentials");
  }

  const isValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Calculate expiration timestamps as ISO strings
  const expiredAt = new Date(Date.now() + 3600 * 1000).toISOString() as string &
    tags.Format<"date-time">;
  const refreshableUntil = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const accessToken = jwt.sign(
    { id: user.id, type: "workflowManager" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
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
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
