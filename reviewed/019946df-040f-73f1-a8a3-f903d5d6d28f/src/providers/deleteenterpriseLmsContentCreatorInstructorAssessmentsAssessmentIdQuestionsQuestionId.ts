import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Deletes an assessment question by marking its deleted_at timestamp (soft
 * delete).
 *
 * This operation requires authorization as contentCreatorInstructor or
 * organizationAdmin. It ensures tenant isolation by requiring a matching
 * assessmentId and questionId.
 *
 * @param props - Parameters including contentCreatorInstructor payload,
 *   assessmentId, and questionId.
 * @returns Promise that resolves when deletion is complete.
 * @throws Error if the question does not exist or is already deleted.
 */
export async function deleteenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdQuestionsQuestionId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, assessmentId, questionId } = props;

  // Verify question exists and not deleted
  await MyGlobal.prisma.enterprise_lms_assessment_questions.findUniqueOrThrow({
    where: {
      id: questionId,
      assessment_id: assessmentId,
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date());

  // Soft delete question via deleted_at timestamp
  await MyGlobal.prisma.enterprise_lms_assessment_questions.update({
    where: { id: questionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
