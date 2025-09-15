import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves detailed information about a specific enrollment prerequisite
 * linked to an enrollment.
 *
 * This operation enforces tenant isolation and requires system administrator
 * authorization. It fetches the enrollment prerequisite identified by both
 * enrollmentId and enrollmentPrerequisiteId.
 *
 * @param props - Object containing systemAdmin authentication payload,
 *   enrollment ID, and enrollment prerequisite ID
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.enrollmentId - The unique identifier of the enrollment owning
 *   the prerequisite
 * @param props.enrollmentPrerequisiteId - The unique identifier of the
 *   enrollment prerequisite record
 * @returns The detailed enrollment prerequisite information complying with
 *   IEnterpriseLmsEnrollmentPrerequisite
 * @throws {Error} Throws if the enrollment prerequisite record does not exist
 *   or is not linked to the given enrollment
 */
export async function getenterpriseLmsSystemAdminEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  systemAdmin: SystemadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  enrollmentPrerequisiteId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { systemAdmin, enrollmentId, enrollmentPrerequisiteId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirstOrThrow(
      {
        where: {
          id: enrollmentPrerequisiteId,
          enrollment_id: enrollmentId,
        },
      },
    );

  return {
    id: record.id,
    enrollment_id: record.enrollment_id,
    prerequisite_course_id: record.prerequisite_course_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
