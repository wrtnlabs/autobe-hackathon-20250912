import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete an assessment question
 *
 * This operation marks an existing assessment question as deleted by setting
 * the deleted_at timestamp. It forcibly checks that the question belongs to the
 * given assessment and is not already deleted.
 *
 * Authorization is limited to organizationAdmin role.
 *
 * Tenant isolation is enforced by filtering on assessmentId.
 *
 * @param props - Parameters including organizationAdmin payload, assessmentId,
 *   and questionId.
 * @returns Void
 * @throws {Error} Throws if the question is not found or already deleted.
 */
export async function deleteenterpriseLmsOrganizationAdminAssessmentsAssessmentIdQuestionsQuestionId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, assessmentId, questionId } = props;

  // Fetch and verify that the question exists and is not deleted
  await MyGlobal.prisma.enterprise_lms_assessment_questions.findFirstOrThrow({
    where: {
      id: questionId,
      assessment_id: assessmentId,
      deleted_at: null,
    },
  });

  // Mark the question as deleted by updating the deleted_at timestamp
  await MyGlobal.prisma.enterprise_lms_assessment_questions.update({
    where: { id: questionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
