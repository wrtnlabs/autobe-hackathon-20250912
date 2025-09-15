import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import { IPageIHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformFinancialAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List/search paginated financial audit logs
 * (healthcare_platform_financial_audit_logs).
 *
 * Allows authorized system admin users to retrieve a paginated, filtered list
 * of financial audit logs for the healthcare platform—supporting audit,
 * compliance, and regulatory reporting. Search supports filtering on
 * organization, user, entity type, action, time window, with optional paging
 * and ordering controls.
 *
 * @param props - Request parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload (must have
 *   type systemAdmin)
 * @param props.body - Search, filtering, pagination, and sorting options (see
 *   IHealthcarePlatformFinancialAuditLog.IRequest)
 * @returns A paginated list of financial audit log records matching supplied
 *   filters (IPageIHealthcarePlatformFinancialAuditLog)
 * @throws {Error} If database operations fail
 */
export async function patchhealthcarePlatformSystemAdminFinancialAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformFinancialAuditLog.IRequest;
}): Promise<IPageIHealthcarePlatformFinancialAuditLog> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build action_timestamp condition (merged gte/lte if both provided)
  let actionTimestampCondition: Record<string, unknown> | undefined = undefined;
  if (
    body.action_timestamp_from !== undefined &&
    body.action_timestamp_from !== null
  ) {
    actionTimestampCondition = {
      ...(actionTimestampCondition ?? {}),
      gte: body.action_timestamp_from,
    };
  }
  if (
    body.action_timestamp_to !== undefined &&
    body.action_timestamp_to !== null
  ) {
    actionTimestampCondition = {
      ...(actionTimestampCondition ?? {}),
      lte: body.action_timestamp_to,
    };
  }
  // Build where clause (contains only provided filters)
  const where = {
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.entity_type !== undefined &&
      body.entity_type !== null && { entity_type: body.entity_type }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.audit_action !== undefined &&
      body.audit_action !== null && { audit_action: body.audit_action }),
    ...(actionTimestampCondition !== undefined && {
      action_timestamp: actionTimestampCondition,
    }),
  };

  // Query total count for pagination
  const total =
    await MyGlobal.prisma.healthcare_platform_financial_audit_logs.count({
      where,
    });
  // Query paginated rows
  const rows =
    await MyGlobal.prisma.healthcare_platform_financial_audit_logs.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy:
        body.sort_by && typeof body.sort_by === "string"
          ? {
              [body.sort_by as string]:
                body.sort_direction === "asc" ? "asc" : "desc",
            }
          : { created_at: "desc" },
    });
  // Map rows to DTO with proper date/uuid handling
  const data = rows.map((row) => {
    return {
      id: row.id,
      organization_id: row.organization_id,
      entity_id: row.entity_id !== undefined ? row.entity_id : undefined,
      user_id: row.user_id !== undefined ? row.user_id : undefined,
      entity_type: row.entity_type,
      audit_action: row.audit_action,
      action_description:
        row.action_description !== undefined
          ? row.action_description
          : undefined,
      action_timestamp: toISOStringSafe(row.action_timestamp),
      created_at: toISOStringSafe(row.created_at),
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
