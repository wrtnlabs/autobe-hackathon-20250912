import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceApiIntegration";
import { IPageIHealthcarePlatformInsuranceApiIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceApiIntegration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve filtered and paginated list of insurance API integrations
 * (healthcare_platform_insurance_api_integrations)
 *
 * This endpoint returns a filtered, paginated, and optionally sorted list of
 * insurance API integration configuration records from the platform's insurance
 * API integration table. Systemadmin authentication required.
 *
 * - Fully supports advanced filtering: organization, vendor code, status,
 *   supported transaction types.
 * - Pagination, sorting, and field selection follow API and DTO conventions
 *   strictly.
 * - All date fields are returned as ISO8601 strings (string &
 *   tags.Format<'date-time'>), never as Date.
 * - Authorization is enforced by decorator (systemAdmin role).
 * - No sensitive fields returned (only those present in schema and DTO).
 *
 * @param props - Contains system admin payload and search/filter body
 * @param props.systemAdmin - The authenticated system admin performing the
 *   operation
 * @param props.body - The search/filter criteria and pagination/sort options
 * @returns Paginated list of integration configs (excluding sensitive secrets)
 * @throws {Error} If not a systemAdmin
 */
export async function patchhealthcarePlatformSystemAdminInsuranceApiIntegrations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformInsuranceApiIntegration.IRequest;
}): Promise<IPageIHealthcarePlatformInsuranceApiIntegration> {
  const { systemAdmin, body } = props;

  // Extra role check - preserved for contract, but decorator guarantees
  if (systemAdmin.type !== "systemAdmin") {
    throw new Error("Not a system admin");
  }

  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = Number(page - 1) * Number(page_size);

  // Parse sort: expects 'field direction', e.g., 'created_at DESC'
  let orderByField = "created_at";
  let orderByDir: "asc" | "desc" = "desc";
  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    if (parts[0]) orderByField = parts[0];
    if (
      parts[1] &&
      (parts[1].toLowerCase() === "asc" || parts[1].toLowerCase() === "desc")
    ) {
      orderByDir = parts[1].toLowerCase() as "asc" | "desc";
    }
  }

  // Where clause (conditionally includes only present filters)
  const where: Record<string, unknown> = {
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        healthcare_platform_organization_id: body.organization_id,
      }),
    ...(body.insurance_vendor_code !== undefined &&
      body.insurance_vendor_code !== null && {
        insurance_vendor_code: {
          contains: body.insurance_vendor_code,
        },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.supported_transaction_types !== undefined &&
      body.supported_transaction_types !== null && {
        supported_transaction_types: {
          contains: body.supported_transaction_types,
        },
      }),
  };

  // Prisma paginated query & count in parallel
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_insurance_api_integrations.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: Number(page_size),
    }),
    MyGlobal.prisma.healthcare_platform_insurance_api_integrations.count({
      where,
    }),
  ]);

  // Map DB rows to API DTO (coerce all date fields using toISOStringSafe, handle nulls correctly)
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
      limit: Number(page_size),
      records: Number(count),
      pages: Math.ceil(Number(count) / Number(page_size)),
    },
    data,
  };
}
