import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment.
 *
 * Retrieves detailed information about a specific proctored exam tied to a
 * particular assessment. Requires authentication as contentCreatorInstructor
 * role.
 *
 * @param props - Object containing authentication and identifiers
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor payload
 * @param props.assessmentId - UUID of the assessment
 * @param props.proctoredExamId - UUID of the proctored exam
 * @returns Detailed proctored exam information conforming to
 *   IEnterpriseLmsProctoredExam
 * @throws {Error} When the proctored exam is not found or access is
 *   unauthorized
 */
export async function getenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { contentCreatorInstructor, assessmentId, proctoredExamId } = props;

  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirst({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  if (!proctoredExam) {
    throw new Error("Proctored exam not found");
  }

  return {
    id: proctoredExam.id,
    assessment_id: proctoredExam.assessment_id,
    exam_session_id: proctoredExam.exam_session_id,
    proctor_id: proctoredExam.proctor_id ?? null,
    scheduled_at: toISOStringSafe(proctoredExam.scheduled_at),
    status: proctoredExam.status,
    created_at: toISOStringSafe(proctoredExam.created_at),
    updated_at: toISOStringSafe(proctoredExam.updated_at),
    deleted_at: proctoredExam.deleted_at
      ? toISOStringSafe(proctoredExam.deleted_at)
      : null,
  };
}
