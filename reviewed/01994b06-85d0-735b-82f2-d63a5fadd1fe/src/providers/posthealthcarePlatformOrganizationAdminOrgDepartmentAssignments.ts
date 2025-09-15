import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new organization-department assignment in
 * healthcare_platform_org_department_assignments.
 *
 * This endpoint allows an authenticated organizationAdmin to establish a new
 * mapping between an organization and a department. The operation enforces
 * business rules on uniqueness (only one active assignment per org+dept) and
 * validates the existence and active (non-soft-deleted) status of both the
 * organization and department. Audit timestamps and unique identifiers are
 * assigned.
 *
 * Only organizationAdmin or systemAdmin roles are authorized. Attempting to
 * create a duplicate or assign non-existent (or soft-deleted) orgs or
 * departments will result in an error. Successful creation returns the newly
 * established assignment entity with full audit metadata.
 *
 * @param props - { organizationAdmin, body }
 * @param props.organizationAdmin - The authenticated admin performing the
 *   action
 * @param props.body - Organization and department IDs for assignment
 * @returns The newly created assignment (id, org_id, dept_id, created_at,
 *   updated_at, possibly deleted_at)
 * @throws {Error} If the organization or department is missing/deleted, or the
 *   assignment already exists
 */
export async function posthealthcarePlatformOrganizationAdminOrgDepartmentAssignments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformOrgDepartmentAssignment.ICreate;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const { organizationAdmin, body } = props;

  // 1. Validate organization existence and non-deleted
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (!org) {
    throw new Error("Organization does not exist or has been deleted");
  }

  // 2. Validate department existence and non-deleted
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: body.healthcare_platform_department_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!department) {
    throw new Error("Department does not exist or has been deleted");
  }

  // 3. Check for duplicate assignment
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          healthcare_platform_department_id:
            body.healthcare_platform_department_id,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  if (duplicate) {
    throw new Error("Organization-department assignment already exists");
  }

  // 4. Prepare values
  const assignmentId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 5. Create assignment
  const created =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.create(
      {
        data: {
          id: assignmentId,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id,
          healthcare_platform_department_id:
            body.healthcare_platform_department_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    );

  // 6. Return DTO (honor deleted_at optionality: undefined if null)
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      created.healthcare_platform_department_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at === null ? undefined : created.deleted_at,
  };
}
