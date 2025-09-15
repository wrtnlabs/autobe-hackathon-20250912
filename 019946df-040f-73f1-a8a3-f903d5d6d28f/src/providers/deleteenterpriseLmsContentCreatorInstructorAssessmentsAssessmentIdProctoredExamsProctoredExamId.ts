import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Deletes a proctored exam in the Enterprise LMS identified by
 * 'proctoredExamId' under the assessment with 'assessmentId'.
 *
 * This operation performs a hard delete, permanently removing the proctored
 * exam record and all associated metadata.
 *
 * Only authorized content creator/instructor users can execute this operation.
 *
 * @param props - Object containing the authenticated user and relevant
 *   identifiers
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor user making the request
 * @param props.assessmentId - Unique UUID of the target assessment
 * @param props.proctoredExamId - Unique UUID of the target proctored exam
 *   session
 * @throws {Error} When the proctored exam does not exist or is already deleted
 */
export async function deleteenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, assessmentId, proctoredExamId } = props;

  // Verify that the proctored exam exists for the given assessment and is active (not soft-deleted)
  await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
    where: {
      id: proctoredExamId,
      assessment_id: assessmentId,
      deleted_at: null,
    },
  });

  // No additional authorization beyond the authenticated contentCreatorInstructor parameter required here

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_proctored_exams.delete({
    where: {
      id: proctoredExamId,
    },
  });
}
