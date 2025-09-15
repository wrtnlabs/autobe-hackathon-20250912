import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";
import { IPageIHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPharmacyIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list pharmacy integration connectors for an organization
 * (healthcare_platform_pharmacy_integrations table)
 *
 * Retrieves a paginated, filterable list of configured pharmacy integration
 * connectors for a healthcare organization. This endpoint allows authorized
 * organization administrators to query vendor connector records for
 * e-prescribing, networked pharmacy workflows, operational discovery, and
 * compliance audit. Supports robust filtering, sort, and pagination.
 *
 * Authorization: Only accessible by valid organization admins actively assigned
 * to an organization. Results are scoped/isolated to the org.
 *
 * @param props - OrganizationAdmin: The authenticated organization admin making
 *   the request. body: IHealthcarePlatformPharmacyIntegration.IRequest
 *   filter/pagination options.
 * @returns Page of IHealthcarePlatformPharmacyIntegration matching filters and
 *   RBAC.
 * @throws {Error} If the admin is not assigned to any active organization, or
 *   there was a database error.
 */
export async function patchhealthcarePlatformOrganizationAdminPharmacyIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPharmacyIntegration.IRequest;
}): Promise<IPageIHealthcarePlatformPharmacyIntegration> {
  const { organizationAdmin, body } = props;

  // 1. RBAC isolation: find active organization assignment for admin
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
    });
  if (orgAssignment == null)
    throw new Error("Organization admin has no active organization assignment");
  const organizationId = orgAssignment.healthcare_platform_organization_id;

  // 2. Construct where filter
  const where = {
    healthcare_platform_organization_id: organizationId,
    ...(body.pharmacy_vendor_code !== undefined &&
      body.pharmacy_vendor_code !== null && {
        pharmacy_vendor_code: body.pharmacy_vendor_code,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.supported_protocol !== undefined &&
      body.supported_protocol !== null && {
        supported_protocol: body.supported_protocol,
      }),
    // Date ranges for created_at (gte/lte)
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    // deleted_at must be explicit: if undefined, omit filter (show all); if null, filter for nulls (active only); else exact match
    ...(body.deleted_at !== undefined && {
      deleted_at: body.deleted_at,
    }),
  };

  // 3. Pagination parameters (default page=1, pageSize=20)
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // 4. Sorting
  // Allow only whitelisted sort fields
  const sortableFields = [
    "created_at",
    "updated_at",
    "pharmacy_vendor_code",
    "status",
  ];
  const requestedSortField = body.sort
    ? body.sort.replace(/^-/, "")
    : "created_at";
  const isDesc = body.sort ? body.sort.startsWith("-") : true;
  const sortField =
    sortableFields.indexOf(requestedSortField) !== -1
      ? requestedSortField
      : "created_at";
  const orderBy = {
    [sortField]: isDesc ? "desc" : "asc",
  };

  // 5. Query database concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_pharmacy_integrations.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_pharmacy_integrations.count({
      where,
    }),
  ]);

  // 6. Map to DTO output, ensure all date fields are string & tags.Format<'date-time'>
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      pharmacy_vendor_code: row.pharmacy_vendor_code,
      connection_uri: row.connection_uri,
      supported_protocol: row.supported_protocol,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      // deleted_at is optional and nullable in the DTO
      ...(row.deleted_at !== undefined && row.deleted_at !== null
        ? { deleted_at: toISOStringSafe(row.deleted_at) }
        : { deleted_at: row.deleted_at }),
    };
  });

  // 7. Build pagination
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
