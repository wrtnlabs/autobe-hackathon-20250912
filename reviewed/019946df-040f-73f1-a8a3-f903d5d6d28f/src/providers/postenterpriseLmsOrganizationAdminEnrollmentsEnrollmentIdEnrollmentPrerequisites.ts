import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Creates a new enrollment prerequisite linked to a specific enrollment record.
 *
 * This operation validates organizational authorization, existence of the
 * enrollment and prerequisite course, and tenant consistency.
 *
 * @param props - Object containing the organizationAdmin payload, enrollmentId,
 *   and request body for creating prerequisite.
 * @returns The created enrollment prerequisite record.
 * @throws {Error} If enrollment or course does not exist or tenant mismatch.
 * @throws {Error} If duplicate prerequisite exists.
 */
export async function postenterpriseLmsOrganizationAdminEnrollmentsEnrollmentIdEnrollmentPrerequisites(props: {
  organizationAdmin: OrganizationadminPayload;
  enrollmentId: string;
  body: IEnterpriseLmsEnrollmentPrerequisite.ICreate;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { organizationAdmin, enrollmentId, body } = props;

  // Fetch the enrollment and ensure it exists
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id: enrollmentId },
    });

  if (!enrollment) {
    throw new Error(`Enrollment with id ${enrollmentId} not found`);
  }

  // Fetch the prerequisite course and ensure it exists
  const course = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: body.prerequisite_course_id },
  });

  if (!course) {
    throw new Error(
      `Prerequisite course with id ${body.prerequisite_course_id} not found`,
    );
  }

  // Verify that enrollment and course belong to the same tenant
  if (enrollment.tenant_id !== course.tenant_id) {
    throw new Error(
      "Tenant mismatch between enrollment and prerequisite course",
    );
  }

  // Check for duplicate prerequisite
  const existing =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirst({
      where: {
        enrollment_id: enrollmentId,
        prerequisite_course_id: body.prerequisite_course_id,
      },
    });

  if (existing) {
    throw new Error(
      `Duplicate prerequisite for enrollment ${enrollmentId} and course ${body.prerequisite_course_id}`,
    );
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        enrollment_id: body.enrollment_id,
        prerequisite_course_id: body.prerequisite_course_id,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    enrollment_id: created.enrollment_id,
    prerequisite_course_id: created.prerequisite_course_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
