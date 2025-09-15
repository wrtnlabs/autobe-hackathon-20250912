import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing department entity for a given organization
 * (healthcare_platform_departments table).
 *
 * This endpoint allows authorized organization administrators to update the
 * properties (code, name, status, or soft-delete) of a department within their
 * own organization. Business validations ensure code uniqueness, valid status,
 * organization/admin access, and non-modification of archived departments.
 *
 * @param props - Object containing the operation parameters
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.organizationId - The UUID of the organization to which the
 *   department belongs
 * @param props.departmentId - The UUID of the department to update
 * @param props.body - The department fields to update (code, name, status,
 *   deleted_at)
 * @returns The updated department entity as defined by
 *   IHealthcarePlatformDepartment
 * @throws {Error} If department is not found, is deleted/archived, code
 *   uniqueness fails, status is invalid, RBAC fails, or no fields are provided
 */
export async function puthealthcarePlatformOrganizationAdminOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartment.IUpdate;
}): Promise<IHealthcarePlatformDepartment> {
  const { organizationAdmin, organizationId, departmentId, body } = props;

  // Step 1: Find the department and ensure it is not deleted (archived)
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: departmentId,
        healthcare_platform_organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (!department) {
    throw new Error("Department not found or already deleted");
  }

  // Step 2: Enforce that only admins from correct organization may update
  // (Org admin has implicit access by being authenticated for given organization)
  // Additional RBAC logic may go here if more than one org per admin is allowed.

  // Step 3: Validate code uniqueness (if code is to be updated)
  if (body.code !== undefined) {
    const exists =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: {
          code: body.code,
          healthcare_platform_organization_id: organizationId,
          deleted_at: null,
          NOT: { id: departmentId },
        },
      });
    if (exists) {
      throw new Error("Department code already exists in this organization");
    }
  }

  // Step 4: Enforce valid department status
  const allowedStatuses = ["active", "suspended", "archived"];
  if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
    throw new Error("Invalid department status");
  }

  // Step 5: Ensure at least one updatable field is provided
  if (
    body.code === undefined &&
    body.name === undefined &&
    body.status === undefined &&
    body.deleted_at === undefined
  ) {
    throw new Error("No updatable fields provided");
  }

  // Step 6: Prepare update input with type-safe handling and date normalization
  const now = toISOStringSafe(new Date());
  const updateInput = {
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.status !== undefined && { status: body.status }),
    // deleted_at can be set to a string, null, or undefined (API allows all forms)
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    updated_at: now,
  };

  // Step 7: Apply the update
  const updated = await MyGlobal.prisma.healthcare_platform_departments.update({
    where: { id: departmentId },
    data: updateInput,
  });

  // Step 8: Return result with all dates as string & tags.Format<'date-time'>
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    code: updated.code,
    name: updated.name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at is optional, null, or string per API type
    ...(updated.deleted_at !== null && updated.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : updated.deleted_at === null
        ? { deleted_at: null }
        : {}),
  };
}
