import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new organization-department assignment in
 * healthcare_platform_org_department_assignments.
 *
 * This creates a new record mapping a department to an organization, enabling
 * RBAC inheritance and workflow partitioning in a multi-tenant context. Only
 * systemAdmins are authorized. The function checks for existence and active
 * (not soft-deleted) status of referenced organization and department, and
 * enforces uniqueness of the mapping. Creation timestamps are applied
 * consistently. Soft-deletes are supported for compliance, but only one active
 * mapping is permitted.
 *
 * @param props - Request props for the operation
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the operation
 * @param props.body - The request body with org/department reference IDs
 * @returns The newly created organization-department assignment, with
 *   timestamps and nullable deleted_at field
 * @throws {Error} If the organization or department does not exist or is
 *   soft-deleted
 * @throws {Error} If a duplicate assignment exists for the same org +
 *   department
 * @throws {Error} For other unexpected failures during insertion
 */
export async function posthealthcarePlatformSystemAdminOrgDepartmentAssignments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrgDepartmentAssignment.ICreate;
}): Promise<IHealthcarePlatformOrgDepartmentAssignment> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Validate the referenced organization exists and is not soft-deleted
  const organization =
    await MyGlobal.prisma.healthcare_platform_organizations.findUnique({
      where: { id: props.body.healthcare_platform_organization_id },
    });
  if (!organization || organization.deleted_at !== null) {
    throw new Error("Organization not found or deleted");
  }

  // Validate the referenced department exists and is not soft-deleted
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findUnique({
      where: { id: props.body.healthcare_platform_department_id },
    });
  if (!department || department.deleted_at !== null) {
    throw new Error("Department not found or deleted");
  }

  // Check for existing (non-soft-deleted) assignment to prevent duplicates
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.findFirst(
      {
        where: {
          healthcare_platform_organization_id:
            props.body.healthcare_platform_organization_id,
          healthcare_platform_department_id:
            props.body.healthcare_platform_department_id,
          deleted_at: null,
        },
      },
    );
  if (duplicate) {
    throw new Error("Assignment already exists");
  }

  // Insert the new assignment row
  const created =
    await MyGlobal.prisma.healthcare_platform_org_department_assignments.create(
      {
        data: {
          id: v4(),
          healthcare_platform_organization_id:
            props.body.healthcare_platform_organization_id,
          healthcare_platform_department_id:
            props.body.healthcare_platform_department_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    );

  // Return the fully shaped DTO, using undefined for missing deleted_at
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
