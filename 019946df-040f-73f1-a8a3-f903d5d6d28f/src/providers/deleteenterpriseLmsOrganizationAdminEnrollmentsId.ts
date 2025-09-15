import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete an enrollment by ID in the Enterprise LMS.
 *
 * This operation marks an enrollment as deleted by setting the `deleted_at`
 * timestamp to the current time, effectively performing a soft delete.
 *
 * Only authorized organizationAdmin users with matching tenant ownership can
 * perform this action.
 *
 * @param props - Object containing the organizationAdmin context and enrollment
 *   ID
 * @param props.organizationAdmin - The authenticated organizationAdmin payload
 * @param props.id - The UUID of the enrollment to soft delete
 * @throws {Error} When the enrollment does not exist or is already deleted
 * @throws {Error} When the organizationAdmin is unauthorized to delete this
 *   enrollment
 */
export async function deleteenterpriseLmsOrganizationAdminEnrollmentsId(props: {
  organizationAdmin: { id: string & tags.Format<"uuid"> };
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, id } = props;

  // Fetch the enrollment with learner relation to verify tenant ownership
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id },
      include: { learner: true },
    });

  if (enrollment === null || enrollment.deleted_at !== null) {
    throw new Error("Enrollment not found or already deleted");
  }

  if (enrollment.learner.tenant_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Perform the soft delete by setting deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: {
      deleted_at: deletedAt,
    },
  });
}
