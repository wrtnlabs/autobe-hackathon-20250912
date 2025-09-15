import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete the specified assessment by its UUID.
 *
 * This operation performs a hard delete removing the assessment and all its
 * dependent data, including questions and results, from the database. Only
 * users with organizationAdmin roles are authorized to perform this
 * irreversible deletion.
 *
 * @param props - Object containing the organizationAdmin payload and the
 *   assessmentId.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   performing the deletion.
 * @param props.assessmentId - UUID of the assessment to delete.
 * @returns Void
 * @throws {Error} When the assessment is not found.
 */
export async function deleteenterpriseLmsOrganizationAdminAssessmentsAssessmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, assessmentId } = props;

  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUniqueOrThrow({
      where: { id: assessmentId },
    });

  await MyGlobal.prisma.enterprise_lms_assessment_questions.deleteMany({
    where: { assessment_id: assessmentId },
  });

  await MyGlobal.prisma.enterprise_lms_assessment_results.deleteMany({
    where: { assessment_id: assessmentId },
  });

  await MyGlobal.prisma.enterprise_lms_proctored_exams.deleteMany({
    where: { assessment_id: assessmentId },
  });

  await MyGlobal.prisma.enterprise_lms_assessments.delete({
    where: { id: assessmentId },
  });
}
