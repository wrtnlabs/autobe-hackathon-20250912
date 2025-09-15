import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a proctored exam in the Enterprise LMS identified by
 * 'proctoredExamId' under the assessment with 'assessmentId'.
 *
 * This function verifies that the requestor is an active organization
 * administrator belonging to the tenant that owns the assessment. It then
 * performs a hard delete permanently removing the proctored exam record.
 *
 * @param props - Object containing the authenticated organization administrator
 *   and path parameters for assessment and proctored exam IDs.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload.
 * @param props.assessmentId - UUID of the target assessment.
 * @param props.proctoredExamId - UUID of the target proctored exam session.
 * @throws {Error} When the proctored exam or assessment does not exist.
 * @throws {Error} When the organizationAdmin is unauthorized to delete the
 *   exam.
 */
export async function deleteenterpriseLmsOrganizationAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, assessmentId, proctoredExamId } = props;

  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirst({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        assessment_id: true,
      },
    });

  if (!proctoredExam) {
    throw new Error("Proctored exam not found");
  }

  const assessment = await MyGlobal.prisma.enterprise_lms_assessments.findFirst(
    {
      where: {
        id: assessmentId,
        deleted_at: null,
      },
      select: {
        tenant_id: true,
      },
    },
  );

  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
        status: "active",
        tenant_id: assessment.tenant_id,
      },
      select: {
        id: true,
      },
    });

  if (!admin) {
    throw new Error("Unauthorized");
  }

  await MyGlobal.prisma.enterprise_lms_proctored_exams.delete({
    where: {
      id: proctoredExamId,
    },
  });
}
