import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Registers a new trigger operator user account.
 *
 * This operation creates a new trigger operator with unique email and hashed
 * password. Password hashing is performed using MyGlobal.password.hash to
 * ensure secure storage. Upon successful registration, JWT access and refresh
 * tokens are issued with appropriate expiration times. The user record includes
 * timestamps and supports soft deletion with a nullable deleted_at.
 *
 * @param props - Object containing the request body with user credentials
 * @param props.body - The trigger operator registration credentials including
 *   email and password_hash
 * @returns The authorized trigger operator user including JWT token data
 * @throws {Error} When registration fails due to duplicate email or other
 *   database constraints
 */
export async function postauthTriggerOperatorJoin(props: {
  body: INotificationWorkflowTriggerOperator.ICreate;
}): Promise<INotificationWorkflowTriggerOperator.IAuthorized> {
  const { body } = props;

  // Hash the password using MyGlobal.password.hash
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Generate UUID for the new user
  const newId = v4() as string & tags.Format<"uuid">;

  // Current timestamp strings for creation and update
  const now = toISOStringSafe(new Date());

  // Create new trigger operator user record
  const created =
    await MyGlobal.prisma.notification_workflow_triggeroperators.create({
      data: {
        id: newId,
        email: body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Calculate token expiration timestamps
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      userId: created.id,
      role: "triggerOperator",
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
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Construct token object
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  // Return user info with tokens
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token,
  };
}
