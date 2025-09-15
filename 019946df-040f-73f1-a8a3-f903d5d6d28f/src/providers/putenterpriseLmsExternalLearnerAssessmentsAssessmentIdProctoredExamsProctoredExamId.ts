import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Update an existing proctored exam session by ID for a specific assessment.
 *
 * This operation allows an authenticated external learner user to update fields
 * such as scheduling, proctor assignment, status, and soft deletion timestamp
 * for a proctored exam session.
 *
 * It confirms the existence of the proctored exam by IDs and applies the
 * requested updates.
 *
 * @param props - The parameters including authorization, path parameters, and
 *   update body.
 * @param props.externalLearner - Authenticated external learner user payload.
 * @param props.assessmentId - UUID of the assessment to which the proctored
 *   exam belongs.
 * @param props.proctoredExamId - UUID of the proctored exam to be updated.
 * @param props.body - Update data conforming to
 *   IEnterpriseLmsProctoredExam.IUpdate.
 * @returns The fully updated proctored exam entity with all fields.
 * @throws {Error} Throws if the proctored exam doesn't exist or update fails.
 */
export async function putenterpriseLmsExternalLearnerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  externalLearner: ExternallearnerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { externalLearner, assessmentId, proctoredExamId, body } = props;

  const updateData: {
    assessment_id?: string | null | undefined;
    exam_session_id?: string | null | undefined;
    proctor_id?: string | null | undefined;
    scheduled_at?: string | null | undefined;
    status?:
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled"
      | null
      | undefined;
    updated_at?: string | null | undefined;
    deleted_at?: string | null | undefined;
  } = {};

  if ("assessment_id" in body) {
    updateData.assessment_id = body.assessment_id ?? null;
  }
  if ("exam_session_id" in body) {
    updateData.exam_session_id = body.exam_session_id ?? null;
  }
  if ("proctor_id" in body) {
    updateData.proctor_id = body.proctor_id ?? null;
  }
  if ("scheduled_at" in body && body.scheduled_at !== undefined) {
    updateData.scheduled_at = body.scheduled_at ?? null;
  }
  if ("status" in body) {
    updateData.status = body.status ?? null;
  }
  if ("updated_at" in body && body.updated_at !== undefined) {
    updateData.updated_at = body.updated_at ?? null;
  }
  if ("deleted_at" in body) {
    updateData.deleted_at = body.deleted_at ?? null;
  }

  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: {
      id: proctoredExamId,
      assessment_id: assessmentId,
    },
    data: updateData,
  });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id === null ? null : updated.proctor_id,
    scheduled_at: updated.scheduled_at,
    status: updated.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
