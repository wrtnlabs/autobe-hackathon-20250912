import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPerformanceMetric";
import { IPageIEnterpriseLmsPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsPerformanceMetric";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated performance metrics.
 *
 * This operation retrieves performance metrics filtered by tenant, metric name,
 * and recorded time, ensuring multi-tenant data isolation for organization
 * administrators.
 *
 * @param props - Object containing the authenticated organization admin and
 *   search criteria
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.body - Request body filtering and pagination parameters
 * @returns Paginated performance metrics matching the criteria
 * @throws {Error} If an unexpected error occurs during database access
 */
export async function patchenterpriseLmsOrganizationAdminPerformanceMetrics(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsPerformanceMetric.IRequest;
}): Promise<IPageIEnterpriseLmsPerformanceMetric> {
  const { organizationAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where: {
    tenant_id?: (string & tags.Format<"uuid">) | null;
    metric_name?: { contains: string };
    recorded_at?: string & tags.Format<"date-time">;
  } = {};

  if (body.tenant_id !== undefined) {
    where.tenant_id = body.tenant_id;
  }
  if (body.metric_name !== undefined) {
    where.metric_name = { contains: body.metric_name };
  }
  if (body.recorded_at !== undefined) {
    where.recorded_at = body.recorded_at;
  }

  if (where.tenant_id === undefined || where.tenant_id === null) {
    where.tenant_id = organizationAdmin.id;
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_performance_metrics.findMany({
      where,
      orderBy: { recorded_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_performance_metrics.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      tenant_id: record.tenant_id ?? null,
      metric_name: record.metric_name,
      metric_value: record.metric_value,
      recorded_at: toISOStringSafe(record.recorded_at),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
