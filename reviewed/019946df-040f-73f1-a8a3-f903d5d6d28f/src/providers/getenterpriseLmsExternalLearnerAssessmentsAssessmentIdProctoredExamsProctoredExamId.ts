import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment.
 *
 * This operation fetches detailed information of a single proctored exam
 * identified by its unique proctoredExamId for a given assessmentId within the
 * Enterprise Learning Management System. It accesses the
 * enterprise_lms_proctored_exams table to retrieve metadata such as exam
 * session ID, proctor ID, scheduled time, and status.
 *
 * The API requires both assessmentId and proctoredExamId as UUID path
 * parameters. It restricts access to authorized roles including systemAdmin,
 * organizationAdmin, departmentManager, contentCreatorInstructor,
 * corporateLearner, externalLearner, and guest.
 *
 * The operation returns the detailed proctored exam entity without a request
 * body.
 *
 * @param props - Object containing authorization and identifying parameters
 * @param props.externalLearner - The authenticated external learner
 * @param props.assessmentId - Unique identifier of the assessment
 * @param props.proctoredExamId - Unique identifier of the proctored exam
 * @returns Detailed information of the requested proctored exam
 * @throws {Error} If the proctored exam does not exist or is soft-deleted
 */
export async function getenterpriseLmsExternalLearnerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  externalLearner: ExternallearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { externalLearner, assessmentId, proctoredExamId } = props;

  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: proctoredExam.id,
    assessment_id: proctoredExam.assessment_id,
    exam_session_id: proctoredExam.exam_session_id,
    proctor_id: proctoredExam.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(proctoredExam.scheduled_at),
    status: proctoredExam.status,
    created_at: toISOStringSafe(proctoredExam.created_at),
    updated_at: toISOStringSafe(proctoredExam.updated_at),
    deleted_at: proctoredExam.deleted_at
      ? toISOStringSafe(proctoredExam.deleted_at)
      : null,
  };
}
