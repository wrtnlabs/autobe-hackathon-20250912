import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing proctored exam session by ID for a specific assessment.
 *
 * This operation allows authorized systemAdmin users to modify scheduling,
 * proctor assignment, and status fields. It ensures the target proctored exam
 * belongs to the specified assessmentId and is not soft-deleted. All date-time
 * fields are handled as ISO string branded types according to API conventions.
 *
 * @param props - Object containing authentication, path parameters, and update
 *   body.
 * @param props.systemAdmin - Authenticated system administrator invoking the
 *   update.
 * @param props.assessmentId - UUID string identifying the assessment to which
 *   the proctored exam belongs.
 * @param props.proctoredExamId - UUID string uniquely identifying the proctored
 *   exam session to update.
 * @param props.body - Properties to update on the proctored exam session,
 *   conforming to IUpdate DTO.
 * @returns Updated proctored exam entity reflecting all persisted changes.
 * @throws {Error} Throws if the proctored exam with given IDs does not exist or
 *   is soft deleted.
 */
export async function putenterpriseLmsSystemAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { systemAdmin, assessmentId, proctoredExamId, body } = props;

  // Verify the proctored exam exists and belongs to the assessment, not deleted
  await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
    where: {
      id: proctoredExamId,
      assessment_id: assessmentId,
      deleted_at: null,
    },
  });

  // Perform update with only fields defined in the input
  // Always update the updated_at timestamp
  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: { id: proctoredExamId },
    data: {
      assessment_id: body.assessment_id ?? undefined,
      exam_session_id: body.exam_session_id ?? undefined,
      proctor_id: body.proctor_id ?? undefined,
      scheduled_at: body.scheduled_at ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Map to API type and convert nullable fields correctly
  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id ?? undefined,
    scheduled_at: updated.scheduled_at,
    status: updated.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at ?? null,
  };
}
