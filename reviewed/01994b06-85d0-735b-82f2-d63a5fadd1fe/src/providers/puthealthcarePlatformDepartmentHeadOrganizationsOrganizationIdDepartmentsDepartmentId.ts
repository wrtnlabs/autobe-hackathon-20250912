import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing department entity for a given organization
 * (healthcare_platform_departments table).
 *
 * Updates a department's code, name, status, or soft-delete in a multi-tenant
 * organization context. Only department heads with assignment to the targeted
 * department/organization may perform this update. This enforces RBAC, prevents
 * updates to deleted or locked departments, and handles unique constraints.
 * Returns the updated department matching IHealthcarePlatformDepartment.
 *
 * @param props - Parameters for the department update.
 * @param props.departmentHead - Authenticated department head user (from
 *   decorator).
 * @param props.organizationId - Organization id (contextual scope for update).
 * @param props.departmentId - Target department id.
 * @param props.body - Fields to update (code, name, status, or soft-delete).
 * @returns The updated department entity (DTO shape).
 * @throws {Error} If department not found, already deleted, locked for
 *   legal/compliance, validation fails, or unique constraint is violated.
 */
export async function puthealthcarePlatformDepartmentHeadOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  departmentHead: DepartmentheadPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartment.IUpdate;
}): Promise<IHealthcarePlatformDepartment> {
  const { departmentHead, organizationId, departmentId, body } = props;

  // 1. Fetch department for update; must match org/deptID
  const department =
    await MyGlobal.prisma.healthcare_platform_departments.findFirst({
      where: {
        id: departmentId,
        healthcare_platform_organization_id: organizationId,
      },
    });
  if (!department) throw new Error("Department not found");

  // 2. Forbid if deleted
  if (department.deleted_at !== null && department.deleted_at !== undefined)
    throw new Error("Cannot update deleted or archived department");

  // 3. Forbid if locked (legal hold or compliance lock)
  const locked =
    await MyGlobal.prisma.healthcare_platform_record_locks.findFirst({
      where: {
        patient_record_id: departmentId,
        released_at: null,
      },
    });
  if (locked)
    throw new Error(
      "Department is currently locked for legal or compliance reasons",
    );

  // 4. Business validations: non-blank code and name (on update)
  if (body.code !== undefined && body.code.trim().length === 0)
    throw new Error("Department code must not be blank");
  if (body.name !== undefined && body.name.trim().length === 0)
    throw new Error("Department name must not be blank");

  // 5. Attempt update (inline, only updatable fields; updated_at forced to current time)
  let updatedDepartment: typeof department;
  try {
    updatedDepartment =
      await MyGlobal.prisma.healthcare_platform_departments.update({
        where: { id: departmentId },
        data: {
          code: body.code ?? undefined,
          name: body.name ?? undefined,
          status: body.status ?? undefined,
          deleted_at: body.deleted_at ?? undefined,
          updated_at: toISOStringSafe(new Date()),
        },
      });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Department code must be unique within organization");
    }
    throw err;
  }

  // 6. Return all fields strictly shaped for IHealthcarePlatformDepartment (convert all dates)
  return {
    id: updatedDepartment.id,
    healthcare_platform_organization_id:
      updatedDepartment.healthcare_platform_organization_id,
    code: updatedDepartment.code,
    name: updatedDepartment.name,
    status: updatedDepartment.status,
    created_at: toISOStringSafe(updatedDepartment.created_at),
    updated_at: toISOStringSafe(updatedDepartment.updated_at),
    deleted_at:
      updatedDepartment.deleted_at !== null &&
      updatedDepartment.deleted_at !== undefined
        ? toISOStringSafe(updatedDepartment.deleted_at)
        : undefined,
  };
}
