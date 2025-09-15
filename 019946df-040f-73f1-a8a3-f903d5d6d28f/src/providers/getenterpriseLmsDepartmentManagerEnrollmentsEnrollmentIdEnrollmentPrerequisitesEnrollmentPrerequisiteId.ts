import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Get specific enrollment prerequisite details
 *
 * This operation retrieves detailed information of a single enrollment
 * prerequisite record in the Enterprise Learning Management System (LMS). It
 * requires the enrollment ID and the specific enrollment prerequisite ID as
 * path parameters to precisely identify and fetch the data.
 *
 * Tenant data isolation and access checks are expected to be enforced before
 * calling this function.
 *
 * @param props - Object containing the departmentManager payload and
 *   identifiers
 * @param props.departmentManager - Authenticated department manager payload
 * @param props.enrollmentId - UUID of the enrollment owning the prerequisite
 * @param props.enrollmentPrerequisiteId - UUID of the enrollment prerequisite
 *   record
 * @returns Promise resolving to the detailed enrollment prerequisite
 *   information
 * @throws {Error} Throws if enrollment prerequisite is not found
 */
export async function getenterpriseLmsDepartmentManagerEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  departmentManager: DepartmentmanagerPayload;
  enrollmentId: string & tags.Format<"uuid">;
  enrollmentPrerequisiteId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { departmentManager, enrollmentId, enrollmentPrerequisiteId } = props;

  const prereq =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findUniqueOrThrow(
      {
        where: {
          id: enrollmentPrerequisiteId,
          enrollment_id: enrollmentId,
        },
      },
    );

  return {
    id: prereq.id,
    enrollment_id: prereq.enrollment_id,
    prerequisite_course_id: prereq.prerequisite_course_id,
    created_at: toISOStringSafe(prereq.created_at),
    updated_at: toISOStringSafe(prereq.updated_at),
  };
}
