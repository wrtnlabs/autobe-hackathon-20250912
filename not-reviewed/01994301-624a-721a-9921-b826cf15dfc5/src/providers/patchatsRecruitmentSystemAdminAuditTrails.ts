import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuditTrail";
import { IPageIAtsRecruitmentAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAuditTrail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Paginated search/listing of system audit trail log events (systemAdmin only)
 *
 * Fetch a list of audit trail log entries across ATS system administrative,
 * credential, settings, and critical business actions. Supports multifaceted
 * filtering by actor_id, actor_role, operation_type (CRUD/AUTH), target_type
 * (table/entity), date/time range, and free-text search (GIN index used for
 * event_detail).
 *
 * The listing is paginated for performance in high-volume deployments and
 * provides both full detail and summary fields for compliance review. Only
 * systemAdmin is authorized to perform listing/search, which is often used for
 * incident response, governance, or internal audit processes. Validation
 * includes filter parameter sanitization and pagination size limits.
 *
 * Use this operation with appropriate PII/data access controls—ensure only
 * necessary audit fields are returned, masking sensitive personal data as
 * needed. Related: no create/update/delete API for audit trails as they are
 * system-generated and immutable.
 *
 * @param props - Input containing systemAdmin payload and
 *   search/filter/pagination body
 *
 *   - Props.systemAdmin: The authenticated system administrator's payload
 *   - Props.body: Search filters and pagination/sort specification
 *
 * @returns A paginated result of audit trail log entries matching criteria
 * @throws {Error} If database operation fails or inputs are inconsistent
 */
export async function patchatsRecruitmentSystemAdminAuditTrails(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentAuditTrail.IRequest;
}): Promise<IPageIAtsRecruitmentAuditTrail> {
  const { body } = props;
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? Number(body.page)
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit >= 1
      ? Number(body.limit)
      : 20;
  const skip = (page - 1) * limit;

  // Parse sort order
  let orderByField: keyof typeof MyGlobal.prisma.ats_recruitment_audit_trails =
    "event_timestamp";
  let orderByDirection: "asc" | "desc" = "desc";
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const segments = body.sort.split(":");
    if (segments[0])
      orderByField =
        segments[0] as keyof typeof MyGlobal.prisma.ats_recruitment_audit_trails;
    if (segments[1] === "asc" || segments[1] === "desc")
      orderByDirection = segments[1];
  }

  // Filtering
  const where = {
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.actor_role !== undefined &&
      body.actor_role !== null && { actor_role: body.actor_role }),
    ...(body.operation_type !== undefined &&
      body.operation_type !== null && { operation_type: body.operation_type }),
    ...(body.target_type !== undefined &&
      body.target_type !== null && { target_type: body.target_type }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && { target_id: body.target_id }),
    ...((body.event_timestamp_from !== undefined &&
      body.event_timestamp_from !== null) ||
    (body.event_timestamp_to !== undefined && body.event_timestamp_to !== null)
      ? {
          event_timestamp: {
            ...(body.event_timestamp_from !== undefined &&
              body.event_timestamp_from !== null && {
                gte: body.event_timestamp_from,
              }),
            ...(body.event_timestamp_to !== undefined &&
              body.event_timestamp_to !== null && {
                lte: body.event_timestamp_to,
              }),
          },
        }
      : {}),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { event_detail: { contains: body.search } },
            { actor_role: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Query DB
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_audit_trails.count({ where }),
    MyGlobal.prisma.ats_recruitment_audit_trails.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
  ]);

  const data: IAtsRecruitmentAuditTrail[] = rows.map((row) => {
    return {
      id: row.id,
      event_timestamp: toISOStringSafe(row.event_timestamp),
      actor_id: row.actor_id,
      actor_role: row.actor_role,
      operation_type: row.operation_type,
      target_type: row.target_type,
      target_id: row.target_id ?? undefined,
      event_detail: row.event_detail,
      ip_address: row.ip_address ?? undefined,
      user_agent: row.user_agent ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
