import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific access log entry by accessLogId for audit and
 * investigative review.
 *
 * This endpoint allows a system administrator to obtain full detail for a
 * specific access log event, including all audited fields for resource access,
 * as required for compliance or security investigation.
 *
 * Only users with the systemAdmin role may access this endpoint. The returned
 * entry contains the actor, organization, resource type, resource id,
 * justification, IP, and timestamp. Throws an error if not found.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.accessLogId - The UUID of the access log entry
 * @returns The detailed access log entry with all context fields
 * @throws {Error} If the access log entry does not exist or access is not
 *   permitted
 */
export async function gethealthcarePlatformSystemAdminAccessLogsAccessLogId(props: {
  systemAdmin: SystemadminPayload;
  accessLogId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAccessLog> {
  const { accessLogId } = props;

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
    throw new Error("Access log entry not found");
  }
  return {
    id: log.id,
    user_id: log.user_id,
    organization_id: log.organization_id,
    resource_type: log.resource_type,
    resource_id: log.resource_id ?? undefined,
    access_purpose: log.access_purpose ?? undefined,
    ip_address: log.ip_address ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
