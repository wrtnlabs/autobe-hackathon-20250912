import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Creates a new enrollment prerequisite associated with the specified
 * enrollment.
 *
 * This operation ensures that the prerequisite course exists and belongs to the
 * same tenant as the enrollment. It prevents duplicate prerequisite entries and
 * enforces data integrity.
 *
 * @param props - The properties required for creating the enrollment
 *   prerequisite.
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   operation.
 * @param props.enrollmentId - The UUID of the enrollment to link the
 *   prerequisite to.
 * @param props.body - The data containing the prerequisite_course_id.
 * @returns The created enrollment prerequisite record.
 * @throws Will throw an error if the enrollment or prerequisite course is not
 *   found, or if a duplicate prerequisite already exists.
 */
export async function postenterpriseLmsSystemAdminEnrollmentsEnrollmentIdEnrollmentPrerequisites(props: {
  systemAdmin: SystemadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.ICreate;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUniqueOrThrow({
      where: { id: props.enrollmentId },
      select: { id: true, tenant_id: true },
    });

  const prerequisiteCourse =
    await MyGlobal.prisma.enterprise_lms_contents.findFirst({
      where: {
        id: props.body.prerequisite_course_id,
        tenant_id: enrollment.tenant_id,
      },
    });

  if (!prerequisiteCourse) {
    throw new Error("Prerequisite course not found or not in the same tenant");
  }

  const duplicate =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirst({
      where: {
        enrollment_id: props.enrollmentId,
        prerequisite_course_id: props.body.prerequisite_course_id,
      },
    });

  if (duplicate) {
    throw new Error("Duplicate enrollment prerequisite exists");
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        enrollment_id: props.enrollmentId,
        prerequisite_course_id: props.body.prerequisite_course_id,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    enrollment_id: created.enrollment_id,
    prerequisite_course_id: created.prerequisite_course_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
