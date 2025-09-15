import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Updates an existing enrollment record in Enterprise LMS by the
 * departmentManager role.
 *
 * This operation ensures multi-tenant isolation by verifying the enrollment
 * belongs to the tenant of the authenticated departmentManager. It updates
 * allowed enrollment fields except for soft delete timestamp.
 *
 * @param props - Object containing:
 *
 *   - DepartmentManager: Authenticated departmentManager payload with tenant
 *       context
 *   - Id: UUID of the enrollment to update
 *   - Body: Enrollment update data conforming to IEnterpriseLmsEnrollment.IUpdate
 *
 * @returns Updated enrollment information
 * @throws {Error} When enrollment is not found
 * @throws {Error} When departmentManager not found
 * @throws {Error} When unauthorized due to tenant mismatch
 */
export async function putenterpriseLmsDepartmentManagerEnrollmentsId(props: {
  departmentManager: DepartmentmanagerPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollment.IUpdate;
}): Promise<IEnterpriseLmsEnrollment> {
  const { departmentManager, id, body } = props;

  // Fetch enrollment, include learner for tenant check
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id },
      include: { learner: true },
    });
  if (!enrollment) throw new Error("Enrollment not found");

  // Fetch departmentManager record to get tenant_id
  const manager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
    });
  if (!manager) throw new Error("Department Manager not found");

  // Tenant isolation check
  if (enrollment.learner.tenant_id !== manager.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Prepare update data excluding deleted_at
  const updateData: IEnterpriseLmsEnrollment.IUpdate = {
    learner_id: body.learner_id ?? undefined,
    learning_path_id: body.learning_path_id ?? undefined,
    status: body.status ?? undefined,
    business_status: body.business_status ?? null,
    created_at: body.created_at ? toISOStringSafe(body.created_at) : undefined,
    updated_at: body.updated_at ? toISOStringSafe(body.updated_at) : undefined,
  };

  // Perform update
  const updated = await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: updateData,
  });

  // Return updated enrollment with conversion
  return {
    id: updated.id,
    learner_id: updated.learner_id,
    learning_path_id: updated.learning_path_id,
    status: updated.status,
    business_status: updated.business_status ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
