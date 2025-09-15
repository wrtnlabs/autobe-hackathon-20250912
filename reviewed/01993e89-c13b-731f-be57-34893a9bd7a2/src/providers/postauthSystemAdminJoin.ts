import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Register new system administrator and issue JWT tokens
 *
 * This operation registers a new system administrator account with a unique
 * email and hashed password. Upon successful creation, it returns the system
 * administrator data including JWT access and refresh tokens. The tokens
 * include expiry information and use the configured JWT secret and issuer.
 *
 * @param props - The function properties containing systemAdmin payload and
 *   registration body
 * @param props.systemAdmin - The authenticated system admin initiating this
 *   operation (should not be used for authorization since this is a join
 *   operation)
 * @param props.body - The registration data containing email and plaintext
 *   password
 * @returns The newly registered system administrator data with tokens
 * @throws {Error} Throws error if the provided email is already registered
 */
export async function postauthSystemAdminJoin(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowSystemAdmin.IRequestJoin;
}): Promise<INotificationWorkflowSystemAdmin.IAuthorized> {
  const { body } = props;

  // Check if the email is already registered
  const existing =
    await MyGlobal.prisma.notification_workflow_systemadmins.findFirst({
      where: { email: body.email },
    });
  if (existing) {
    throw new Error("Email already registered");
  }

  // Hash the plain password securely
  const passwordHash = await MyGlobal.password.hash(body.password);

  // Generate new UUID and timestamps
  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the new system admin user record
  const created =
    await MyGlobal.prisma.notification_workflow_systemadmins.create({
      data: {
        id: newId,
        email: body.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "systemAdmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration times as ISO strings
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Return the authorized response
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
