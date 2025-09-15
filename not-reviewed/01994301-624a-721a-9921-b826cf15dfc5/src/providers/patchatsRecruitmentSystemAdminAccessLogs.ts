import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAccessLog";
import { IPageIAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAccessLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Advanced search and paginated retrieval of system access logs
 * (ats_recruitment_access_logs)
 *
 * Provides paginated, filtered search access to audit logs in the
 * ats_recruitment_access_logs table. Allows systemAdmin users to conduct
 * complex queries—including search by actor, target type, access reason, and
 * timestamps. Results include audit and compliance data for monitoring and
 * traceability. Supports advanced filtering, sorting, and pagination.
 *
 * Only users with the systemAdmin role may access this endpoint due to the
 * sensitivity of the audit data. Returned records include actor details,
 * accessed entities, business justification, and associated network/device
 * metadata. The response follows the paginated pattern for large log datasets,
 * respecting the IAtsRecruitmentAccessLog.IRequest and
 * IPageIAtsRecruitmentAccessLog types for request and response payloads,
 * respectively.
 *
 * This search functionality is essential for legal, regulatory, security, and
 * incident investigation purposes and forms part of the broader compliance
 * posture of the platform. Error scenarios include 400 for invalid filters and
 * 403 for unauthorized access.
 *
 * @param props - SystemAdmin: The authenticated system administrator performing
 *   this query (authorization enforced by decorator) body: The filter, sort,
 *   and pagination criteria for this access log search
 *   (IAtsRecruitmentAccessLog.IRequest)
 * @returns IPageIAtsRecruitmentAccessLog - The paginated and filtered access
 *   log entries
 * @throws {Error} When page or limit is invalid or exceeds maximum allowed
 */
export async function patchatsRecruitmentSystemAdminAccessLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentAccessLog.IRequest;
}): Promise<IPageIAtsRecruitmentAccessLog> {
  const { body } = props;
  const MAX_LIMIT = 1000;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (limit > MAX_LIMIT) throw new Error("Page size too large");
  if (page < 1) throw new Error("Invalid page number");

  // Build where clause as a plain object (never use 'any', let Prisma infer)
  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && { actor_type: body.actor_type }),
    ...(body.target_type !== undefined &&
      body.target_type !== null && { target_type: body.target_type }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && { target_id: body.target_id }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && { ip_address: body.ip_address }),
    ...(body.device_info !== undefined &&
      body.device_info !== null && { device_info: body.device_info }),
    ...(body.access_reason !== undefined &&
      body.access_reason !== null && { access_reason: body.access_reason }),
    ...(body.accessed_at_from !== undefined || body.accessed_at_to !== undefined
      ? {
          accessed_at: {
            ...(body.accessed_at_from !== undefined &&
              body.accessed_at_from !== null && { gte: body.accessed_at_from }),
            ...(body.accessed_at_to !== undefined &&
              body.accessed_at_to !== null && { lte: body.accessed_at_to }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;
  // Always order by accessed_at desc for most recent first
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_access_logs.findMany({
      where,
      orderBy: { accessed_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_access_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      actor_type: row.actor_type,
      target_type: row.target_type,
      target_id: row.target_id,
      accessed_at: toISOStringSafe(row.accessed_at),
      ip_address: row.ip_address ?? undefined,
      device_info: row.device_info ?? undefined,
      access_reason: row.access_reason ?? undefined,
    })),
  };
}
