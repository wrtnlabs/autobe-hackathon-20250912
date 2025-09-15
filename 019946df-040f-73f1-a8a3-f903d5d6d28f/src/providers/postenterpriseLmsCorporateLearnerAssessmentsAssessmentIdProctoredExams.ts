import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create a new proctored exam session linked to a specific assessment.
 *
 * This function creates a new record in the enterprise_lms_proctored_exams
 * table, associating it with the specified assessment ID. It sets all necessary
 * metadata, including scheduled time, proctor assignment, status, creation, and
 * update timestamps.
 *
 * Authorization for this operation is restricted to users with the appropriate
 * role (corporateLearner).
 *
 * @param props - The parameters and request body data for creation
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.assessmentId - UUID of the assessment to link the proctored exam
 * @param props.body - Creation data adhering to
 *   IEnterpriseLmsProctoredExam.ICreate
 * @returns The newly created proctored exam entity
 * @throws {Error} When assessmentId in path does not match body.assessment_id
 */
export async function postenterpriseLmsCorporateLearnerAssessmentsAssessmentIdProctoredExams(props: {
  corporateLearner: CorporatelearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { corporateLearner, assessmentId, body } = props;

  if (assessmentId !== body.assessment_id) {
    throw new Error("Assessment ID in path and body do not match");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id,
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
