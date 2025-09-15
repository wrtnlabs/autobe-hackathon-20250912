import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { IPageIHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceApiIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve filtered and paginated list of insurance API integrations
 * (healthcare_platform_insurance_api_integrations)
 *
 * Retrieves a filtered, paginated, and optionally sorted list of insurance API
 * integration configuration records from the
 * healthcare_platform_insurance_api_integrations table. Organization admin is
 * ONLY permitted to access integrations belonging to their own organization
 * (identified by their user id). All other records are invisible, even if
 * included by user-provided filters.
 *
 * Supports filtering by insurance_vendor_code, status, and
 * supported_transaction_types, as well as robust pagination and limited sort
 * options. Returns all core details for integration records, with all date
 * fields in ISO 8601 string format (branded as string &
 * tags.Format<'date-time'>), and deleted_at as nullable where appropriate.
 * Results are always keyed on the allowed fields in the DTO (never expose extra
 * fields or allow leakage of non-permitted data).
 *
 * @param props - Object containing organizationAdmin payload and request body
 *   for filtering/pagination
 * @param props.organizationAdmin - Authenticated admin payload ({ id: uuid,
 *   type: "organizationadmin" })
 * @param props.body - Filter/sort/search parameters
 *   (IHealthcarePlatformInsuranceApiIntegration.IRequest)
 * @returns Paginated list of insurance integration configuration records,
 *   restricted to the admin's organization scope.
 * @throws {Error} If pagination parameters are invalid or on internal error
 */
export async function patchhealthcarePlatformOrganizationAdminInsuranceApiIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformInsuranceApiIntegration.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceApiIntegration> {
  const { organizationAdmin, body } = props;
  // Validate and default pagination
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const pageSize =
    typeof body.page_size === "number" && body.page_size > 0
      ? body.page_size
      : 20;
  const skip = (page - 1) * pageSize;

  // Enforce strict org scoping: orgAdmin only sees their own org, regardless of filters
  const orgId = organizationAdmin.id;

  // Build Prisma where clause from allowed filters only
  const where = {
    healthcare_platform_organization_id: orgId,
    ...(body.insurance_vendor_code !== undefined &&
      body.insurance_vendor_code !== null && {
        insurance_vendor_code: body.insurance_vendor_code,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.supported_transaction_types !== undefined &&
      body.supported_transaction_types !== null && {
        supported_transaction_types: body.supported_transaction_types,
      }),
  };

  // Safe sort field parsing
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "insurance_vendor_code",
    "status",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (typeof body.sort === "string" && body.sort.trim().length > 0) {
    const [rawField, rawDir] = body.sort.trim().split(/\s+/);
    const field = allowedSortFields.includes(rawField)
      ? rawField
      : "created_at";
    const dirRaw = (rawDir || "desc").toLowerCase();
    const dir = dirRaw === "asc" ? "asc" : "desc";
    orderBy = { [field]: dir };
  }

  // Fetch records and total count atomically
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_insurance_api_integrations.count({
      where,
    }),
  ]);

  // Transform records to conform to DTO, convert all date fields
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    insurance_vendor_code: row.insurance_vendor_code,
    connection_uri: row.connection_uri,
    supported_transaction_types: row.supported_transaction_types,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
