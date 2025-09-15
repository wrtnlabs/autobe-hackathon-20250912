import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete (revoke) a specific authentication session record and immediately
 * terminate access, only permitted for system administrators.
 *
 * This operation sets the 'revoked_at' timestamp on the specified
 * authentication session (by UUID), permanently revoking access for the session
 * token. The endpoint is only accessible by system administrators and does not
 * perform a hard-delete for audit/compliance. If the session does not exist or
 * is already revoked, a clear error is raised for compliance audibility.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system administrator payload
 *   (authorization enforced by decorator)
 * @param props.authSessionId - Unique identifier (UUID) for the authentication
 *   session to revoke
 * @returns Void
 * @throws {Error} If the session does not exist or is already revoked (for
 *   audit trace)
 */
export async function deletehealthcarePlatformSystemAdminAuthSessionsAuthSessionId(props: {
  systemAdmin: SystemadminPayload;
  authSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { authSessionId } = props;

  // Find the session by unique ID
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findUnique({
      where: { id: authSessionId },
    });

  if (!session) {
    throw new Error("Authentication session not found");
  }
  if (session.revoked_at !== null) {
    throw new Error("Authentication session is already revoked");
  }

  // Set revoked_at timestamp (soft-revoke, audit-compliant)
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: authSessionId },
    data: { revoked_at: toISOStringSafe(new Date()) },
  });
}
