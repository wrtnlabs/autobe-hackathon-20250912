import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Login endpoint for system administrators enabling secure authentication and
 * JWT issuance.
 *
 * Validates system admin credentials against notification_workflow_systemadmins
 * table. On success, generates JWT access and refresh tokens with proper
 * payloads and expiry.
 *
 * Implements security best practices including soft delete checking, password
 * verification, and token issuer enforcement.
 *
 * @param props - Object containing system administrator authentication request
 *   body.
 * @param props.systemAdmin - The system admin payload (unused but required by
 *   signature).
 * @param props.body - Object containing email and password.
 * @returns Authorization response including tokens and user claims.
 * @throws Error when credentials are invalid or user not found.
 */
export async function postauthSystemAdminLogin(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowSystemAdmin.IRequestLogin;
}): Promise<INotificationWorkflowSystemAdmin.IAuthorized> {
  const { body } = props;

  const user =
    await MyGlobal.prisma.notification_workflow_systemadmins.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const nowISO = toISOStringSafe(new Date());
  const oneHourLater = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const sevenDaysLater = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "systemAdmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
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
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: oneHourLater,
      refreshable_until: sevenDaysLater,
    },
  };
}
