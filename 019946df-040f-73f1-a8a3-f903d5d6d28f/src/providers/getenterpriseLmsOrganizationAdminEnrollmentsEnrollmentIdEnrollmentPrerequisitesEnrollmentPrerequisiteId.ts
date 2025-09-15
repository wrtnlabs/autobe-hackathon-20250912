import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information about a specific enrollment prerequisite linked
 * to an enrollment.
 *
 * This operation enforces tenant-level access restrictions and organization
 * admin role authorization. It returns the full enrollment prerequisite record
 * matching the provided enrollmentId and enrollmentPrerequisiteId.
 *
 * @param props - Object containing authenticated organizationAdmin and
 *   identifiers of enrollment and prerequisite
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   with id
 * @param props.enrollmentId - UUID of the enrollment that owns the prerequisite
 * @param props.enrollmentPrerequisiteId - UUID of the enrollment prerequisite
 *   to fetch
 * @returns The detailed enrollment prerequisite data complying with
 *   IEnterpriseLmsEnrollmentPrerequisite
 * @throws {Error} When the enrollment prerequisite is not found or access is
 *   denied
 */
export async function getenterpriseLmsOrganizationAdminEnrollmentsEnrollmentIdEnrollmentPrerequisitesEnrollmentPrerequisiteId(props: {
  organizationAdmin: OrganizationadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  enrollmentPrerequisiteId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsEnrollmentPrerequisite> {
  const { organizationAdmin, enrollmentId, enrollmentPrerequisiteId } = props;

  // Step 1: Fetch organizationAdmin tenant_id for authorization
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  if (!adminRecord) {
    throw new Error("Organization admin record not found");
  }

  // Step 2: Fetch enrollment prerequisite and include enrollment to check tenant
  const prereq =
    await MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findFirst({
      where: {
        id: enrollmentPrerequisiteId,
        enrollment_id: enrollmentId,
        enrollment: {
          tenant_id: adminRecord.tenant_id,
        },
      },
    });

  if (!prereq) {
    throw new Error(`Enrollment prerequisite not found or unauthorized`);
  }

  // Return with date fields converted to ISO string
  return {
    id: prereq.id,
    enrollment_id: prereq.enrollment_id,
    prerequisite_course_id: prereq.prerequisite_course_id,
    created_at: toISOStringSafe(prereq.created_at),
    updated_at: toISOStringSafe(prereq.updated_at),
  };
}
