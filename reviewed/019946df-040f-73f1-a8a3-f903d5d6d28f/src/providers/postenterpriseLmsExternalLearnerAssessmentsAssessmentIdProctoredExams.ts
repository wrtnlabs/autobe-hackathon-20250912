import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Create a new proctored exam session linked to a specific assessment.
 *
 * This function ensures the assessment ID in the URL path matches the body. It
 * generates a new UUID for the session, sets timestamps with ISO string format,
 * and initializes soft delete flag as null.
 *
 * @param props - Object containing externalLearner, assessmentId, and body.
 * @param props.externalLearner - Authenticated external learner payload.
 * @param props.assessmentId - UUID string of the assessment linked to the exam.
 * @param props.body - Data conforming to IEnterpriseLmsProctoredExam.ICreate
 *   for creation.
 * @returns Newly created proctored exam session with all relevant metadata.
 * @throws {Error} Throws if assessmentId mismatch or database errors occur.
 */
export async function postenterpriseLmsExternalLearnerAssessmentsAssessmentIdProctoredExams(props: {
  externalLearner: ExternallearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { externalLearner, assessmentId, body } = props;

  if (body.assessment_id !== assessmentId) {
    throw new Error("Assessment ID in path and body do not match");
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      assessment_id: body.assessment_id,
      exam_session_id: body.exam_session_id,
      proctor_id: body.proctor_id ?? null,
      scheduled_at: body.scheduled_at,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    assessment_id: created.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: created.exam_session_id,
    proctor_id: created.proctor_id ?? null,
    scheduled_at: toISOStringSafe(created.scheduled_at),
    status: created.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
