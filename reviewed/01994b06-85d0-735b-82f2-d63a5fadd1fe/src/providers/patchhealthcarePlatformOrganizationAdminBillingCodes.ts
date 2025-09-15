import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import { IPageIHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingCode";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list billing codes with filter, sort, and pagination
 * (healthcare_platform_billing_codes table)
 *
 * This operation retrieves a filtered, paginated list of billing codes
 * (procedures, item codes, diagnoses) from the
 * healthcare_platform_billing_codes table. It enables advanced search for
 * administrators and billing staff, supporting code lookup by system (CPT,
 * ICD-10, internal), status, descriptive filters, and sort/pagination controls.
 * Results are returned as summary records for use in selection UIs and
 * reporting.
 *
 * Authorization: Only accessible to authenticated organization administrators
 * (organizationadmin), as validated by the OrganizationadminPayload.
 *
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.body - Filters, sorting, and pagination options for code lookup
 * @returns Paginated set of billing code summaries and page metadata
 * @throws {Error} If an unsupported sortBy field is specified or query fails
 */
export async function patchhealthcarePlatformOrganizationAdminBillingCodes(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingCode.IRequest;
}): Promise<IPageIHealthcarePlatformBillingCode.ISummary> {
  const { body } = props;

  // Allowed fields for sorting validation
  const allowedSortFields = ["code", "code_system", "name", "created_at"];

  // Pagination defaults and constraints
  let page = body.page ?? 1;
  if (typeof page !== "number" || page < 1) page = 1;
  let pageSize = body.pageSize ?? 20;
  if (typeof pageSize !== "number" || pageSize < 1) pageSize = 20;
  if (pageSize > 1000) pageSize = 1000;
  const skip = (page - 1) * pageSize;

  // Validate sortBy
  const sortBy =
    body.sortBy && allowedSortFields.includes(body.sortBy)
      ? body.sortBy
      : "code";
  const sortDir = body.sortDir === "desc" ? "desc" : "asc";

  // Build where filters
  const where = {
    ...(body.code !== undefined &&
      body.code !== null &&
      body.code !== "" && {
        code: { contains: body.code },
      }),
    ...(body.code_system !== undefined &&
      body.code_system !== null &&
      body.code_system !== "" && {
        code_system: body.code_system,
      }),
    ...(body.name !== undefined &&
      body.name !== null &&
      body.name !== "" && {
        name: { contains: body.name },
      }),
    ...(body.description !== undefined &&
      body.description !== null &&
      body.description !== "" && {
        description: { contains: body.description },
      }),
    ...(typeof body.active === "boolean" && { active: body.active }),
  };

  // Prisma query for data and total count (in parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_codes.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        code_system: true,
        active: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_billing_codes.count({ where }),
  ]);

  // Map results to DTO; ensure date is string & tags.Format<'date-time'>
  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    code_system: row.code_system,
    active: row.active,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Return response (IPageIHealthcarePlatformBillingCode.ISummary structure)
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
