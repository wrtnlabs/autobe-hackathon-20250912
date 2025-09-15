import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Refresh session and access tokens for authenticatedUser
 * (storyfield_ai_token_sessions) given existing, valid session/refresh token.
 *
 * This operation verifies the current refresh token from the Authorization
 * header, validates that the associated session and user are active and not
 * revoked, then issues a new access and refresh token pair with updated
 * expiration. Session and audit data are updated for compliance.
 *
 * @param props - Props containing body (empty for refresh)
 * @returns IStoryfieldAiAuthenticatedUser.IAuthorized response (user profile +
 *   new token contract)
 * @throws {Error} When authorization is missing, token is invalid, session is
 *   expired, revoked, or user is inactive.
 */
export async function postauthAuthenticatedUserRefresh(props: {
  body: IStoryfieldAiAuthenticatedUser.IRefresh;
}): Promise<IStoryfieldAiAuthenticatedUser.IAuthorized> {
  // Framework should inject header/cookie/token as needed.
  // Here, expect the refresh token in Authorization header: Bearer <token>
  // Try reading from MyGlobal.request.headers (if implemented), else mock error
  // If no request context, throw error with clear message.
  const req = (MyGlobal as any).request;
  if (
    !req ||
    !req.headers ||
    typeof req.headers["authorization"] !== "string"
  ) {
    throw new Error("Authorization header with refresh token is required");
  }
  const authHeader: string = req.headers["authorization"];
  const [scheme, token] = authHeader.split(" ");
  if (scheme.toLowerCase() !== "bearer" || !token) {
    throw new Error("Malformed Authorization header - expected Bearer token");
  }
  const refreshToken = token;

  // Decode/verify JWT refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Validate JWT payload shape
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    typeof (decoded as any).id !== "string" ||
    !("type" in decoded) ||
    (decoded as any).type !== "authenticatedUser"
  ) {
    throw new Error("Malformed refresh token payload");
  }
  const userId = (decoded as { id: string; type: string }).id;

  // Compute token hash
  const tokenHash = await MyGlobal.password.hash(refreshToken);
  const session = await MyGlobal.prisma.storyfield_ai_token_sessions.findFirst({
    where: {
      token_hash: tokenHash,
      authenticated_user_id: userId,
      deleted_at: null,
    },
  });
  if (!session) {
    throw new Error("Session not found or expired");
  }

  // Validate session is not expired (session.expires_at is string, must parse to Date)
  const now = new Date();
  if (now > new Date(session.expires_at)) {
    throw new Error("Session expired");
  }

  // Check for revocation
  const revoked =
    await MyGlobal.prisma.storyfield_ai_token_revocations.findFirst({
      where: { token_hash: tokenHash },
    });
  if (revoked) {
    throw new Error("Refresh token has been revoked");
  }

  // User account must be active
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst(
    {
      where: {
        id: userId,
        deleted_at: null,
      },
    },
  );
  if (!user) {
    throw new Error("User not found or deactivated");
  }

  // Compute new token expiration times (access: 1h, refresh: 30d)
  const accessExp = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Generate new access and refresh tokens
  const newAccessToken = jwt.sign(
    {
      id: user.id,
      type: "authenticatedUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const newRefreshToken = jwt.sign(
    {
      id: user.id,
      type: "authenticatedUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "30d",
    },
  );

  // Update session timestamps
  const updateTimestamp = toISOStringSafe(now);
  await MyGlobal.prisma.storyfield_ai_token_sessions.update({
    where: { id: session.id },
    data: {
      refreshed_at: updateTimestamp,
      last_activity_at: updateTimestamp,
      updated_at: updateTimestamp,
    },
  });

  // Write audit log (ignore errors)
  try {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: session.id,
        authenticated_user_id: user.id,
        event_type: "refreshed",
        event_outcome: "success",
        event_message: "Token refreshed via /auth/authenticatedUser/refresh",
        created_at: updateTimestamp,
      },
    });
  } catch {}

  // Return refreshed user and token structure
  return {
    id: user.id,
    external_user_id: user.external_user_id,
    email: user.email,
    actor_type: "authenticatedUser",
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExp),
      refreshable_until: toISOStringSafe(refreshExp),
    },
  };
}
