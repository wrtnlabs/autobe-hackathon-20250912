import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Refresh JWT tokens for trigger operator user
 *
 * This operation validates the provided refresh token and issues new access and
 * refresh tokens. It ensures the renewed tokens have the same payload structure
 * as issued during login/join.
 *
 * @param props - Object containing the refresh token in the body
 * @param props.body - Request body containing the refresh_token string
 * @returns The authorized trigger operator user data along with new JWT tokens
 * @throws {Error} If the refresh token is invalid or the user does not exist
 */
export async function postauthTriggerOperatorRefresh(props: {
  body: INotificationWorkflowTriggerOperator.IRefresh;
}): Promise<INotificationWorkflowTriggerOperator.IAuthorized> {
  const { refresh_token } = props.body;

  // Validate and decode the refresh token
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string };

  // Find the user by decoded id
  const user =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findUnique({
      where: { id: decoded.id },
    });

  if (!user) {
    throw new Error("User not found");
  }

  // Current timestamp for token expiry calculations
  const nowTimestamp = Date.now();

  // Generate new access token (expires in 1 hour)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, type: "triggerOperator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate new refresh token (expires in 7 days)
  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Construct expiry times as ISO 8601 strings
  const expiredAt = toISOStringSafe(new Date(nowTimestamp + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(nowTimestamp + 7 * 24 * 3600 * 1000),
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
