import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Update an existing proctored exam session by ID for a specific assessment
 *
 * This operation updates the scheduling, proctor assignment, and status fields
 * of a proctored exam identified by `proctoredExamId` belonging to the
 * specified `assessmentId`. It updates only the provided fields and sets the
 * update timestamp.
 *
 * @param props - The properties for updating the proctored exam
 * @param props.departmentManager - The authenticated department manager
 *   performing the update
 * @param props.assessmentId - UUID of the assessment this proctored exam
 *   belongs to
 * @param props.proctoredExamId - UUID of the proctored exam to update
 * @param props.body - The update payload following
 *   IEnterpriseLmsProctoredExam.IUpdate
 * @returns The updated proctored exam entity with all fields
 * @throws {Error} If the proctored exam is not found or is deleted
 */
export async function putenterpriseLmsDepartmentManagerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  departmentManager: DepartmentmanagerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { departmentManager, assessmentId, proctoredExamId, body } = props;

  // Verify the proctored exam exists and belongs to the assessment
  const existing =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirst({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });
  if (!existing) throw new Error("Proctored exam not found or deleted");

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Prepare update data with conditional field inclusion
  const updateData: IEnterpriseLmsProctoredExam.IUpdate = {
    updated_at: now,
    ...(body.assessment_id !== undefined &&
      body.assessment_id !== null && {
        assessment_id: body.assessment_id,
      }),
    ...(body.exam_session_id !== undefined &&
      body.exam_session_id !== null && {
        exam_session_id: body.exam_session_id,
      }),
    // proctor_id can be nullable, so allow explicit null
    ...(body.proctor_id !== undefined && {
      proctor_id: body.proctor_id,
    }),
    ...(body.scheduled_at !== undefined &&
      body.scheduled_at !== null && {
        scheduled_at: body.scheduled_at,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.deleted_at !== undefined && {
      deleted_at: body.deleted_at,
    }),
  };

  // Update the record
  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: { id: proctoredExamId },
    data: updateData,
  });

  // Return updated record with ISO string dates and properly handled nullable fields
  return {
    id: updated.id as string & tags.Format<"uuid">,
    assessment_id: updated.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id ?? null,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    status: updated.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
