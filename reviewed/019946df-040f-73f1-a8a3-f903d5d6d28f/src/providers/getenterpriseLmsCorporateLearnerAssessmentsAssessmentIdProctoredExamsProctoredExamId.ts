import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment.
 *
 * Retrieves detailed information about a specific proctored exam tied to a
 * particular assessment. Enables authorized corporate learners to view full
 * metadata of the exam session for monitoring.
 *
 * @param props - Object containing corporateLearner payload and path parameters
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.assessmentId - UUID of the assessment
 * @param props.proctoredExamId - UUID of the proctored exam
 * @returns Detailed proctored exam information matching
 *   IEnterpriseLmsProctoredExam structure
 * @throws {Error} Throws if the proctored exam is not found or inaccessible
 */
export async function getenterpriseLmsCorporateLearnerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { assessmentId, proctoredExamId } = props;

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
    proctor_id: proctoredExam.proctor_id ?? null,
    scheduled_at: toISOStringSafe(proctoredExam.scheduled_at),
    status: proctoredExam.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(proctoredExam.created_at),
    updated_at: toISOStringSafe(proctoredExam.updated_at),
    deleted_at:
      proctoredExam.deleted_at !== null &&
      proctoredExam.deleted_at !== undefined
        ? toISOStringSafe(proctoredExam.deleted_at)
        : null,
  };
}
