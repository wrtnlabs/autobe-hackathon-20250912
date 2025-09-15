import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update an existing proctored exam session for a specified assessment.
 *
 * This operation allows authorized corporate learner users to modify
 * scheduling, proctor details, and status fields of a proctored exam.
 *
 * @param props - Object containing the corporate learner payload, assessmentId,
 *   proctoredExamId, and update body
 * @param props.corporateLearner - The authenticated corporate learner
 * @param props.assessmentId - UUID of the assessment to which the proctored
 *   exam belongs
 * @param props.proctoredExamId - UUID of the proctored exam to update
 * @param props.body - The update data conforming to
 *   IEnterpriseLmsProctoredExam.IUpdate
 * @returns The fully updated proctored exam entity conforming to
 *   IEnterpriseLmsProctoredExam
 * @throws {Error} When the proctored exam is not found or assessmentId
 *   mismatches
 */
export async function putenterpriseLmsCorporateLearnerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { corporateLearner, assessmentId, proctoredExamId, body } = props;

  const existingExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findUnique({
      where: { id: proctoredExamId },
    });
  if (!existingExam) throw new Error("Proctored exam not found");

  if (existingExam.assessment_id !== assessmentId) {
    throw new Error("Assessment ID mismatch");
  }

  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: { id: proctoredExamId },
    data: {
      assessment_id:
        body.assessment_id === null
          ? undefined
          : (body.assessment_id ?? undefined),
      exam_session_id:
        body.exam_session_id === null
          ? undefined
          : (body.exam_session_id ?? undefined),
      proctor_id:
        body.proctor_id === null ? null : (body.proctor_id ?? undefined),
      scheduled_at:
        body.scheduled_at === null
          ? undefined
          : (body.scheduled_at ?? undefined),
      status: body.status === null ? undefined : (body.status ?? undefined),
      updated_at: toISOStringSafe(new Date()),
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id ?? null,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
