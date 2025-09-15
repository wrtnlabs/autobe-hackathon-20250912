import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Authenticates a trigger operator user using provided email and password.
 *
 * Validates the credentials against stored hashed password in the
 * notification_workflow_triggeroperators table. Upon successful authentication,
 * issues JWT access and refresh tokens.
 *
 * @param props - Object containing the login credentials.
 * @param props.body - Credentials including email and password_hash.
 * @returns Authenticated trigger operator user details along with JWT tokens.
 * @throws {Error} When the user is not found or password verification fails.
 */
export async function postauthTriggerOperatorLogin(props: {
  body: INotificationWorkflowTriggerOperator.ILogin;
}): Promise<INotificationWorkflowTriggerOperator.IAuthorized> {
  const { body } = props;

  const user =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    user.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "triggerOperator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate expiration timestamps for tokens
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
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
