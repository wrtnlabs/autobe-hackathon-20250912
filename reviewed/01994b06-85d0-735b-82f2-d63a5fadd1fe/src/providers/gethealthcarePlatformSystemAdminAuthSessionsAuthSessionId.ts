import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuthSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information about a specific authentication session by
 * session ID from healthcare_platform_auth_sessions.
 *
 * This endpoint obtains the full metadata for a specific authentication session
 * by its session ID (authSessionId). All key metadata fields are returned,
 * including tokens, state, expiration, user associations, device info, and
 * revocation status for audit and administrative review. Only system
 * administrators are authorized to query single session details via this API,
 * which is suitable for security, compliance, and incident tracking scenarios.
 * If the session is not found, an error is thrown for downstream error handling
 * and system audit requirements.
 *
 * @param props - The input properties for this operation
 * @param props.systemAdmin - The validated system administrator making the
 *   query (authorization is guaranteed)
 * @param props.authSessionId - The unique session UUID identifying the target
 *   authentication session
 * @returns The full authentication session record as an
 *   IHealthcarePlatformAuthSession, with all timestamps as ISO8601 strings
 * @throws {Error} When the authentication session is not found by ID
 */
export async function gethealthcarePlatformSystemAdminAuthSessionsAuthSessionId(props: {
  systemAdmin: SystemadminPayload;
  authSessionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAuthSession> {
  const { authSessionId } = props;
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirstOrThrow({
      where: { id: authSessionId },
      select: {
        id: true,
        user_id: true,
        user_type: true,
        session_token: true,
        refresh_token: true,
        issued_at: true,
        expires_at: true,
        revoked_at: true,
        user_agent: true,
        ip_address: true,
      },
    });

  return {
    id: session.id,
    user_id: session.user_id,
    user_type: session.user_type,
    session_token: session.session_token,
    refresh_token: session.refresh_token ?? undefined,
    issued_at: toISOStringSafe(session.issued_at),
    expires_at: toISOStringSafe(session.expires_at),
    revoked_at: session.revoked_at
      ? toISOStringSafe(session.revoked_at)
      : undefined,
    user_agent: session.user_agent ?? undefined,
    ip_address: session.ip_address ?? undefined,
  };
}
