import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResultImport";
import { IPageIHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResultImport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List & search lab result imports with filtering, pagination, and error
 * diagnostics (healthcare_platform_lab_result_imports table)
 *
 * Search, filter, and paginate through laboratory result import records. The
 * endpoint provides healthcare organizations with a robust interface for
 * tracking every inbound laboratory result file or message, as described by the
 * healthcare_platform_lab_result_imports Prisma schema. Supports advanced
 * search, filter, and sort; returns paginated DTOs. Only available to
 * organization-admin users.
 *
 * @param props - Object containing org-admin authentication and request body
 * @param props.organizationAdmin - The authenticated organization admin
 * @param props.body - Filtering, sort, and pagination parameters per DTO
 * @returns Paginated list of lab result import record DTOs and pagination info
 * @throws {Error} If a Prisma/database or logic error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminLabResultImports(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLabResultImport.IRequest;
}): Promise<IPageIHealthcarePlatformLabResultImport> {
  const { organizationAdmin, body } = props;

  // Parse pagination parameters, with default page=1, pageSize=20
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.pageSize === "number" && body.pageSize > 0 ? body.pageSize : 20;
  const skip = (page - 1) * limit;

  // Build where clause parameters inline for Prisma
  const where = {
    deleted_at: null,
    ...(body.organizationId !== undefined &&
      body.organizationId !== null && {
        healthcare_platform_organization_id: body.organizationId,
      }),
    ...(body.labIntegrationId !== undefined &&
      body.labIntegrationId !== null && {
        lab_integration_id: body.labIntegrationId,
      }),
    ...(body.parsed_status !== undefined &&
      body.parsed_status !== null && {
        parsed_status: body.parsed_status,
      }),
    ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
    (body.dateTo !== undefined && body.dateTo !== null)
      ? {
          imported_at: {
            ...(body.dateFrom !== undefined &&
              body.dateFrom !== null && { gte: body.dateFrom }),
            ...(body.dateTo !== undefined &&
              body.dateTo !== null && { lte: body.dateTo }),
          },
        }
      : {}),
  };

  // Only support valid sort fields (default: imported_at desc)
  let sortField: "imported_at" | "parsed_status" = "imported_at";

  if (
    typeof body.sortBy === "string" &&
    (body.sortBy === "imported_at" || body.sortBy === "parsed_status")
  ) {
    sortField = body.sortBy;
  }
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sortDirection === "asc" || body.sortDirection === "desc") {
    sortOrder = body.sortDirection;
  }

  // Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_result_imports.findMany({
      where,
      orderBy: [{ [sortField]: sortOrder }],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_lab_result_imports.count({ where }),
  ]);

  // Map results to DTO, converting all date fields and handling null/undefined for optional fields
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    lab_integration_id: row.lab_integration_id,
    raw_payload_reference: row.raw_payload_reference,
    parsed_status: row.parsed_status,
    parsed_message:
      row.parsed_message !== undefined && row.parsed_message !== null
        ? row.parsed_message
        : undefined,
    imported_at: toISOStringSafe(row.imported_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Return paginated result DTO
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
