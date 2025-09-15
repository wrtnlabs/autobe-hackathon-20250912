import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import { IPageIHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformIntegrationLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve filtered/paginated integration logs for monitoring and
 * audit.
 *
 * Retrieves a filtered and paginated list of integration logs for the
 * healthcare platform. Supports advanced filtering (organization,
 * integration_type, event_status, code, date range), full-text search on
 * message/code/status, sorting, and pagination for compliance, troubleshooting,
 * and audit.
 *
 * @param props - Object containing all properties
 * @param props.systemAdmin - The authenticated SystemadminPayload (must be
 *   present and of type 'systemAdmin')
 * @param props.body - Filter/sort/pagination options for integration logs
 * @returns Paginated list of integration log records conforming to ISummary
 * @throws {Error} When called without proper systemAdmin payload
 */
export async function patchhealthcarePlatformSystemAdminIntegrationLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformIntegrationLog.IRequest;
}): Promise<IPageIHealthcarePlatformIntegrationLog.ISummary> {
  // RBAC check
  if (!props.systemAdmin || props.systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: systemAdmin only");
  }
  const {
    healthcare_platform_organization_id,
    integration_type,
    event_status,
    event_code,
    occurred_after,
    occurred_before,
    page,
    page_size,
    order_by,
    search,
  } = props.body;
  const realPage = Number(page ?? 1);
  const realPageSize = Number(page_size ?? 50);
  const skip = (realPage - 1) * realPageSize;
  const take = realPageSize;

  // Compose where clause for Prisma with careful null/undefined handling
  const where = {
    deleted_at: null,
    ...(healthcare_platform_organization_id !== undefined &&
    healthcare_platform_organization_id !== null
      ? {
          healthcare_platform_organization_id,
        }
      : {}),
    ...(integration_type !== undefined && integration_type !== null
      ? {
          integration_type,
        }
      : {}),
    ...(event_status !== undefined && event_status !== null
      ? {
          event_status,
        }
      : {}),
    ...(event_code !== undefined && event_code !== null
      ? {
          event_code,
        }
      : {}),
    ...((occurred_after !== undefined && occurred_after !== null) ||
    (occurred_before !== undefined && occurred_before !== null)
      ? {
          occurred_at: {
            ...(occurred_after !== undefined &&
              occurred_after !== null && { gte: occurred_after }),
            ...(occurred_before !== undefined &&
              occurred_before !== null && { lte: occurred_before }),
          },
        }
      : {}),
    ...(search !== undefined && search !== null && search.length > 0
      ? {
          OR: [
            { event_message: { contains: search } },
            { event_status: { contains: search } },
            { event_code: { contains: search } },
          ],
        }
      : {}),
  };

  // Handle order_by (default occurred_at desc)
  let sortField = "occurred_at";
  let sortDir: "asc" | "desc" = "desc";
  if (typeof order_by === "string" && order_by.trim().length > 0) {
    const [field, dir] = order_by.trim().split(/\s+/);
    if (
      [
        "occurred_at",
        "created_at",
        "updated_at",
        "event_status",
        "event_code",
        "integration_type",
      ].includes(field)
    ) {
      sortField = field;
      sortDir = dir && dir.toLowerCase() === "asc" ? "asc" : "desc";
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_integration_logs.findMany({
      where,
      orderBy: [{ [sortField]: sortDir }],
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_integration_logs.count({
      where,
    }),
  ]);

  // Format output: strictly to output type, strict date handling
  return {
    pagination: {
      current: Number(realPage),
      limit: Number(realPageSize),
      records: Number(total),
      pages: Number(Math.ceil(total / realPageSize)),
    },
    data: rows.map((row) => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      integration_type: row.integration_type,
      referenced_transaction_id: row.referenced_transaction_id ?? undefined,
      event_status: row.event_status,
      event_code: row.event_code,
      event_message: row.event_message ?? undefined,
      occurred_at: toISOStringSafe(row.occurred_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
