import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an enrollment prerequisite by its ID for a specific enrollment
 *
 * This API operation updates an existing enrollment prerequisite associated
 * with a specific enrollment in the Enterprise LMS system. The targeted
 * enrollment and prerequisite record are identified via path parameters. The
 * request body supplies update information for the prerequisite course
 * requirement.
 *
 * The operation modifies prerequisite course references or other modifiable
 * fields as allowed by the schema. Validation ensures that the enrollment and
 * prerequisite belong to the same tenant context and enforces business rules
 * preventing invalid prerequisite settings.
 *
 * This operation is essential for maintaining accurate prerequisite
 * relationships that govern learner enrollments and progression within the
 * learning paths.
 *
 * @param props - Object containing systemAdmin payload, enrollmentId,
 *   enrollmentPrerequisiteId, and update body
 * @returns Updated enrollment prerequisite record with all fields
 * @throws {Error} When the enrollment prerequisite does not exist or does not
 *   belong to the enrollment
 */
export async function putenterpriseLmsSystemAdminEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  systemAdmin: SystemadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  enrollmentPrerequisiteId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.IUpdate;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { systemAdmin, enrollmentId, enrollmentPrerequisiteId, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirst({
      where: {
        id: enrollmentPrerequisiteId,
        enrollment_id: enrollmentId,
      },
    });

  if (!existing) {
    throw new Error(
      `Enrollment prerequisite with ID ${enrollmentPrerequisiteId} for enrollment ${enrollmentId} not found.`,
    );
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.update({
      where: { id: enrollmentPrerequisiteId },
      data: {
        enrollment_id: body.enrollment_id ?? undefined,
        prerequisite_course_id: body.prerequisite_course_id ?? undefined,
        created_at: body.created_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    enrollment_id: updated.enrollment_id,
    prerequisite_course_id: updated.prerequisite_course_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
