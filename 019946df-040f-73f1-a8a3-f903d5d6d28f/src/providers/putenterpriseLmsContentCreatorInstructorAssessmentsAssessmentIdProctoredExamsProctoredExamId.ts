import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Update an existing proctored exam session by its ID for a specific
 * assessment.
 *
 * This operation allows authorized content creator instructors to modify
 * scheduling details, proctor assignment, and status fields of a proctored exam
 * session.
 *
 * It validates that the proctored exam belongs to the specified assessment.
 *
 * @param props - The function parameters including the authenticated content
 *   creator instructor, assessment ID, proctored exam ID, and the update data.
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor performing the update.
 * @param props.assessmentId - The UUID of the assessment to which the proctored
 *   exam belongs.
 * @param props.proctoredExamId - The UUID of the proctored exam to update.
 * @param props.body - The update payload conforming to
 *   IEnterpriseLmsProctoredExam.IUpdate.
 * @returns The fully updated proctored exam entity with all fields.
 * @throws {Error} Throws if the proctored exam is not found or does not belong
 *   to the given assessment.
 */
export async function putenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { contentCreatorInstructor, assessmentId, proctoredExamId, body } =
    props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findUniqueOrThrow({
      where: { id: proctoredExamId },
    });

  if (existing.assessment_id !== assessmentId) {
    throw new Error("Assessment ID mismatch");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: { id: proctoredExamId },
    data: {
      assessment_id:
        body.assessment_id !== undefined
          ? (body.assessment_id ?? undefined)
          : undefined,
      exam_session_id:
        body.exam_session_id !== undefined
          ? (body.exam_session_id ?? undefined)
          : undefined,
      proctor_id:
        body.proctor_id !== undefined
          ? (body.proctor_id ?? undefined)
          : undefined,
      scheduled_at:
        body.scheduled_at !== undefined
          ? (body.scheduled_at ?? undefined)
          : undefined,
      status:
        body.status !== undefined ? (body.status ?? undefined) : undefined,
      updated_at: now,
      deleted_at:
        body.deleted_at !== undefined
          ? (body.deleted_at ?? undefined)
          : undefined,
    },
  });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id ?? null,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
