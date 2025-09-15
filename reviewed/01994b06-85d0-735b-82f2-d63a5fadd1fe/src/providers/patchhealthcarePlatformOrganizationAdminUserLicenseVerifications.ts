import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import { IPageIHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserLicenseVerification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated list of professional user license
 * verifications.
 *
 * This operation allows organization admins to fetch a filtered, paginated list
 * of license verification records for users in their organization. Advanced
 * filtering by user, type, status, or date is supported. Response includes
 * pagination meta-data and all required summary fields.
 *
 * Strict organization scope enforced: only records for users assigned to the
 * calling admin's organization are returned. Unauthorized search for other
 * organizations is forbidden.
 *
 * @param props - Object with authorized organization admin and search request.
 * @param props.organizationAdmin - Authenticated organization admin payload.
 * @param props.body - Search filters, sort order, and pagination.
 * @returns Paginated license verification summaries.
 * @throws {Error} If searching outside admin's own organization or parameters
 *   are invalid.
 */
export async function patchhealthcarePlatformOrganizationAdminUserLicenseVerifications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserLicenseVerification.IRequest;
}): Promise<IPageIHealthcarePlatformUserLicenseVerification.ISummary> {
  const { organizationAdmin, body } = props;

  // Enforce strict org scope
  const adminOrgId = organizationAdmin.id;
  if (
    body.organization_id !== undefined &&
    body.organization_id !== null &&
    body.organization_id !== adminOrgId
  ) {
    throw new Error("Unauthorized: cannot search outside your organization");
  }

  // Find user_ids assigned to admin's organization
  const assignedUserOrgAssignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: { healthcare_platform_organization_id: adminOrgId },
      select: { user_id: true },
    });
  const allowedUserIds = assignedUserOrgAssignments.map((a) => a.user_id);

  if (allowedUserIds.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.page_size ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Pagination setup
  const currentPage =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const pageSize =
    typeof body.page_size === "number" && body.page_size > 0
      ? body.page_size
      : 20;
  const skip = (currentPage - 1) * pageSize;
  const take = pageSize;

  // Build where clause for filters, ensuring only allowed user_ids
  const whereFilters: Record<string, unknown> = {
    user_id: { in: allowedUserIds },
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.user_type !== undefined &&
      body.user_type !== null && { user_type: body.user_type }),
    ...(body.license_number !== undefined &&
      body.license_number !== null && { license_number: body.license_number }),
    ...(body.license_type !== undefined &&
      body.license_type !== null && { license_type: body.license_type }),
    ...(body.verification_status !== undefined &&
      body.verification_status !== null && {
        verification_status: body.verification_status,
      }),
    ...((body.last_verified_at_start !== undefined ||
      body.last_verified_at_end !== undefined) && {
      last_verified_at: {
        ...(body.last_verified_at_start !== undefined &&
          body.last_verified_at_start !== null && {
            gte: body.last_verified_at_start,
          }),
        ...(body.last_verified_at_end !== undefined &&
          body.last_verified_at_end !== null && {
            lte: body.last_verified_at_end,
          }),
      },
    }),
  };

  const orderByParam = {
    last_verified_at: body.sort_order === "asc" ? "asc" : "desc",
  };

  // Query both total count and paged data concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_license_verifications.findMany({
      where: whereFilters,
      orderBy: orderByParam,
      skip,
      take,
      select: {
        id: true,
        user_id: true,
        user_type: true,
        license_number: true,
        license_type: true,
        verification_status: true,
        last_verified_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_license_verifications.count({
      where: whereFilters,
    }),
  ]);

  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(
        total > 0 && pageSize > 0 ? Number(total) / Number(pageSize) : 0,
      ),
    },
    data: records.map((rec) => ({
      id: rec.id,
      user_id: rec.user_id,
      user_type: rec.user_type,
      license_number: rec.license_number,
      license_type: rec.license_type,
      verification_status: rec.verification_status,
      last_verified_at: toISOStringSafe(rec.last_verified_at),
      created_at: toISOStringSafe(rec.created_at),
      updated_at: toISOStringSafe(rec.updated_at),
    })),
  };
}
