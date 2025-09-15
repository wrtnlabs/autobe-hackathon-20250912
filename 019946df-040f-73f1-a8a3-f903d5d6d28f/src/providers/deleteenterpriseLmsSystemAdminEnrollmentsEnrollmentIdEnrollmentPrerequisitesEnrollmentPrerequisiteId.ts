import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a specific enrollment prerequisite associated with a given
 * enrollment.
 *
 * This operation permanently removes the prerequisite from the database. Only
 * authorized system administrators are allowed to perform this deletion.
 *
 * @param props - Object containing systemAdmin payload and identifiers.
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   operation.
 * @param props.enrollmentId - Unique identifier of the target enrollment.
 * @param props.enrollmentPrerequisiteId - Unique identifier of the enrollment
 *   prerequisite to delete.
 * @throws {Error} Throws if the enrollment prerequisite is not found or does
 *   not belong to the specified enrollment.
 */
export async function deleteenterpriseLmsSystemAdminEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  systemAdmin: SystemadminPayload;
  enrollmentId: string;
  enrollmentPrerequisiteId: string;
}): Promise<void> {
  const { systemAdmin, enrollmentId, enrollmentPrerequisiteId } = props;

  const prereq =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirstOrThrow(
      {
        where: {
          id: enrollmentPrerequisiteId,
          enrollment_id: enrollmentId,
        },
      },
    );

  await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.delete({
    where: { id: prereq.id },
  });
}
