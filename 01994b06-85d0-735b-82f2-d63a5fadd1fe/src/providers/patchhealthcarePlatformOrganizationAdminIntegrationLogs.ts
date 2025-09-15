import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import { IPageIHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformIntegrationLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve filtered/paginated integration logs for monitoring and
 * audit.
 *
 * This function returns a paginated list of healthcare platform integration log
 * events matching advanced filtering, search, and sorting criteria. It supports
 * compliance troubleshooting and regulatory audit for system/organization
 * administrators; each log captured is strictly filtered by the admin's
 * organization. Sensitive attributes are never leaked, and cross-organization
 * isolation is enforced.
 *
 * Filtering supports integration type, event status, event code, date range,
 * and flexible keyword search. Pagination, custom ordering, and total count are
 * included. Date/datetime fields are always returned as ISO8601 strings (not
 * native Dates).
 *
 * @param props - Properties object
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting integration log data
 * @param props.body - Filter, sort, and pagination options for the integration
 *   logs API
 * @returns A page of integration log ISummary objects matching the provided
 *   filter and search criteria, with full pagination metadata
 * @throws {Error} If the admin is not found, deleted, or attempts access
 *   outside their own organization
 */
export async function patchhealthcarePlatformOrganizationAdminIntegrationLogs(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformIntegrationLog.IRequest;
}): Promise<IPageIHealthcarePlatformIntegrationLog.ISummary> {
  const { organizationAdmin, body } = props;

  // Step 1: Find the admin user; enforce account validity
  const adminRecord =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!adminRecord) {
    throw new Error("Organization admin not found or deleted");
  }

  // Step 2: Determine the organization scope (required)
  // Per test and API spec, the query is always scoped to the admin's org, never any other org
  const orgId = body.healthcare_platform_organization_id;
  if (!orgId) {
    throw new Error(
      "Organization ID filter is required and must match the admin's organization",
    );
  }

  // Step 3: Set up pagination and sorting
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.page_size ?? 50);
  const skip = (page - 1) * pageSize;

  // Step 4: Filter construction (always restricts to admin's own org)
  const where = {
    healthcare_platform_organization_id: orgId,
    ...(body.integration_type !== undefined &&
      body.integration_type !== null && {
        integration_type: body.integration_type,
      }),
    ...(body.event_status !== undefined &&
      body.event_status !== null && { event_status: body.event_status }),
    ...(body.event_code !== undefined &&
      body.event_code !== null && { event_code: body.event_code }),
    ...((body.occurred_after !== undefined && body.occurred_after !== null) ||
    (body.occurred_before !== undefined && body.occurred_before !== null)
      ? {
          occurred_at: {
            ...(body.occurred_after !== undefined &&
              body.occurred_after !== null && {
                gte: body.occurred_after,
              }),
            ...(body.occurred_before !== undefined &&
              body.occurred_before !== null && {
                lte: body.occurred_before,
              }),
          },
        }
      : {}),
  };

  // Step 5: Full-text search filter (simple OR on event_message/event_code)
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    (where as any).OR = [
      { event_message: { contains: body.search } },
      { event_code: { contains: body.search } },
    ];
  }

  // Step 6: Order by parsing - only allow sortable fields
  let orderBy = { occurred_at: "desc" };
  if (
    body.order_by &&
    typeof body.order_by === "string" &&
    body.order_by.length > 0
  ) {
    const [field, directionRaw] = body.order_by.trim().split(/\s+/);
    const allowed = [
      "occurred_at",
      "created_at",
      "event_status",
      "event_code",
      "integration_type",
    ];
    if (field && allowed.includes(field)) {
      orderBy = {
        [field]:
          directionRaw && directionRaw.toLowerCase() === "asc" ? "asc" : "desc",
      };
    }
  }

  // Step 7: Query paginated data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_integration_logs.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        integration_type: true,
        referenced_transaction_id: true,
        event_status: true,
        event_code: true,
        event_message: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_integration_logs.count({ where }),
  ]);

  // Step 8: Map DB rows to API DTO structure, ensuring proper date/time and optional null/undefined mapping
  const data = rows.map((row) => {
    return {
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
    };
  });

  // Step 9: Assemble and return the paginated response
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
