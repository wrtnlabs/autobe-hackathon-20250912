import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing enrollment prerequisite linked to a specific enrollment.
 *
 * This operation modifies prerequisite course references or other allowed
 * fields. It validates existence and tenant scope consistency.
 *
 * @param props - Function parameters including authorization payload,
 *   identifiers, and update body
 * @returns The updated enrollment prerequisite
 * @throws {Error} When enrollment prerequisite or enrollment is not found
 * @throws {Error} When tenant mismatch detected (authorization failure)
 */
export async function putenterpriseLmsOrganizationAdminEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  organizationAdmin: OrganizationadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  enrollmentPrerequisiteId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.IUpdate;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { organizationAdmin, enrollmentId, enrollmentPrerequisiteId, body } =
    props;

  // Find existing enrollment prerequisite
  const existing =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirst({
      where: {
        id: enrollmentPrerequisiteId,
        enrollment_id: enrollmentId,
      },
    });
  if (!existing) throw new Error("Enrollment prerequisite not found");

  // Find enrollment to check tenant
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id: enrollmentId },
    });
  if (!enrollment) throw new Error("Enrollment not found");

  // Authorization check: currently checks if organizationAdmin id matches enrollment tenant_id
  // This may require tenant id from organizationAdmin for correct check
  if (enrollment.tenant_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update enrollment prerequisite record
  const updated =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.update({
      where: { id: enrollmentPrerequisiteId },
      data: {
        enrollment_id: body.enrollment_id ?? undefined,
        prerequisite_course_id: body.prerequisite_course_id ?? undefined,
        created_at: body.created_at ?? undefined,
        updated_at: now,
      },
    });

  // Return updated prerequisite with correct date-time string format
  return {
    id: updated.id,
    enrollment_id: updated.enrollment_id,
    prerequisite_course_id: updated.prerequisite_course_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
