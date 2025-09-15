import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { IPageIHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrgDepartmentAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a filtered and paginated list of organization-department assignments from
 * healthcare_platform_org_department_assignments.
 *
 * Retrieves organization-department assignment records, supporting search,
 * filtering, and pagination. Only assignments from the organization associated
 * with the authenticated organization admin are returned, regardless of input
 * filters. Returned data includes all audit fields for operational and
 * compliance use.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - Filter and pagination options for the assignment list
 * @returns Paginated list of assignment summaries with audit timestamps
 * @throws {Error} If the admin's organization could not be determined, or on
 *   server error
 */
export async function patchhealthcarePlatformOrganizationAdminOrgDepartmentAssignments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformOrgDepartmentAssignment.IRequest;
}): Promise<IPageIHealthcarePlatformOrgDepartmentAssignment.ISummary> {
  const { organizationAdmin, body } = props;

  // Step 1: Determine the admin's organization (hard RBAC boundary)
  // Admin payload only has admin id; must look up the admin record for org scope
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
      select: { id: true, email: true },
    });
  if (!admin)
    throw new Error("Authenticated organization admin not found or is deleted");

  // Get org assignments -- admin may be assigned to multiple organizations, but in default context, enforce only assignments this admin can manage
  // Here, organizationadminPayload.id refers to the user row id in healthcare_platform_organizationadmins
  // Assignments scope: all assignments for this organization admin's org; but org id must be determined by querying an assignment or user's context

  // Step 2: Fetch the admin's org assignment (organization_admin is unique per org)
  // Assume there is always one primary org assignment for the admin by id in user_org_assignments
  const userOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: admin.id,
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!userOrgAssignment)
    throw new Error("Organizationadmin has no valid organization assignment");
  const orgId = userOrgAssignment.healthcare_platform_organization_id;

  // Step 3: Parse pagination and filtering controls
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Step 4: Build the query 'where' clause
  // Always restrict to only admin's organization, regardless of filter input
  const where: Record<string, unknown> = {
    deleted_at: null,
    healthcare_platform_organization_id: orgId,
  };
  if (
    body.healthcare_platform_department_id !== undefined &&
    body.healthcare_platform_department_id !== null
  ) {
    where.healthcare_platform_department_id =
      body.healthcare_platform_department_id;
  }
  // Date range filters for created_at
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    (where as any).created_at = {
      ...((where as any).created_at ?? {}),
      gte: body.created_at_from,
    };
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    (where as any).created_at = {
      ...((where as any).created_at ?? {}),
      lte: body.created_at_to,
    };
  }
  // Date range filters for updated_at
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    (where as any).updated_at = {
      ...((where as any).updated_at ?? {}),
      gte: body.updated_at_from,
    };
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    (where as any).updated_at = {
      ...((where as any).updated_at ?? {}),
      lte: body.updated_at_to,
    };
  }

  // Step 5: Prepare sort/order logic, defaulting to created_at desc
  let orderBy: any = { created_at: "desc" };
  if (body.orderBy && typeof body.orderBy === "string") {
    const validSortFields = [
      "id",
      "healthcare_platform_organization_id",
      "healthcare_platform_department_id",
      "created_at",
      "updated_at",
    ];
    if (validSortFields.includes(body.orderBy)) {
      const direction = body.direction === "asc" ? "asc" : "desc";
      orderBy = { [body.orderBy]: direction };
    }
  }

  // Step 6: Query data and row count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_org_department_assignments.findMany({
      where,
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        healthcare_platform_department_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_org_department_assignments.count({
      where,
    }),
  ]);

  // Step 7: Map to ISummary and convert date fields
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    healthcare_platform_department_id: row.healthcare_platform_department_id,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  const pages = Math.ceil(Number(total) / Number(limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages,
    },
    data,
  };
}
