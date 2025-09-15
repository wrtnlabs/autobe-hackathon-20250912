import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsIntegrationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSetting";
import { IPageIEnterpriseLmsIntegrationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsIntegrationSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated external integration settings for the tenant of
 * the system admin.
 *
 * This operation requires the authenticated system admin's tenant context.
 * Supports filtering by integration name, configuration key, enablement status,
 * sorting, and pagination.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   request filter parameters
 * @returns Paginated summary list of integration settings matching filters
 * @throws Error if the system admin is not active or has been deleted
 */
export async function patchenterpriseLmsSystemAdminIntegrationSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsIntegrationSetting.IRequest;
}): Promise<IPageIEnterpriseLmsIntegrationSetting.ISummary> {
  const { systemAdmin, body } = props;

  // Validate system admin and get tenant_id
  const systemAdminRecord =
    await MyGlobal.prisma.enterprise_lms_systemadmin.findUniqueOrThrow({
      where: { id: systemAdmin.id },
      select: { tenant_id: true, status: true, deleted_at: true },
    });

  if (
    systemAdminRecord.status !== "active" ||
    systemAdminRecord.deleted_at !== null
  ) {
    throw new Error("System admin is not active or deleted");
  }

  const { tenant_id } = systemAdminRecord;

  // Use pagination defaults if not provided
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Construct Prisma where filter
  const where = {
    tenant_id,
    deleted_at: null,
    ...(body.integration_name !== undefined &&
      body.integration_name !== null && {
        integration_name: { contains: body.integration_name },
      }),
    ...(body.config_key !== undefined &&
      body.config_key !== null && {
        config_key: { contains: body.config_key },
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && {
        enabled: body.enabled,
      }),
  };

  // Determine orderBy field and direction
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (
    body.sort_key &&
    ["integration_name", "created_at", "config_key"].includes(body.sort_key)
  ) {
    orderBy[body.sort_key] = body.sort_direction === "desc" ? "desc" : "asc";
  } else {
    orderBy["created_at"] = "desc";
  }

  // Query integration settings with filters and pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_integration_settings.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_integration_settings.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      integration_name: item.integration_name,
      config_key: item.config_key,
      enabled: item.enabled,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
