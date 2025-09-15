import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific access log entry by accessLogId for audit and
 * investigative review.
 *
 * This operation retrieves all available access log fields for the given
 * accessLogId, with tenant isolation enforcement. Only organization admins may
 * access logs belonging to their organization. Used for compliance, audit, and
 * security investigations.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin requesting
 *   the log entry
 * @param props.accessLogId - The UUID of the access log record to retrieve
 * @returns A fully-populated access log record suitable for audit/compliance
 *   investigation
 * @throws {Error} If the log does not exist
 * @throws {Error} If the admin attempts to access records outside their
 *   organization
 */
export async function gethealthcarePlatformOrganizationAdminAccessLogsAccessLogId(props: {
  organizationAdmin: OrganizationadminPayload;
  accessLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAccessLog> {
  const { organizationAdmin, accessLogId } = props;

  const log = await MyGlobal.prisma.healthcare_platform_access_logs.findUnique({
    where: { id: accessLogId },
    select: {
      id: true,
      user_id: true,
      organization_id: true,
      resource_type: true,
      resource_id: true,
      access_purpose: true,
      ip_address: true,
      created_at: true,
    },
  });

  if (!log) {
    throw new Error("Access log not found");
  }

  // Enforce tenant boundary: only allow access for logs belonging to the admin's org
  if (log.organization_id !== organizationAdmin.id) {
    throw new Error("Access denied: log does not belong to your organization");
  }

  return {
    id: log.id,
    user_id: log.user_id,
    organization_id: log.organization_id,
    resource_type: log.resource_type,
    resource_id: log.resource_id === null ? undefined : log.resource_id,
    access_purpose:
      log.access_purpose === null ? undefined : log.access_purpose,
    ip_address: log.ip_address === null ? undefined : log.ip_address,
    created_at: toISOStringSafe(log.created_at),
  };
}
