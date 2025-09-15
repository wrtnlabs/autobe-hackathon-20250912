import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Create a new proctored exam session linked to a specific assessment.
 *
 * This operation creates a record in the enterprise_lms_proctored_exams table,
 * associating it with the specified assessment ID. It stores all relevant exam
 * metadata including scheduled time, proctor assignments, and status. The
 * creation timestamps are set as current UTC time.
 *
 * Authorization: Only guest role is permitted to perform this operation.
 *
 * @param props - Object containing guest user, assessmentId path, and request
 *   body.
 * @param props.guest - The authenticated guest user initiating the creation.
 * @param props.assessmentId - UUID of the target assessment to link.
 * @param props.body - Proctored exam creation details conforming to ICreate
 *   DTO.
 * @returns Newly created proctored exam entity with all metadata.
 * @throws {Error} Throws error if creation fails or database operation errors.
 */
export async function postenterpriseLmsGuestAssessmentsAssessmentIdProctoredExams(props: {
  guest: GuestPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { guest, assessmentId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      assessment_id: assessmentId,
      exam_session_id: body.exam_session_id,
      proctor_id: body.proctor_id ?? undefined,
      scheduled_at: toISOStringSafe(body.scheduled_at),
      status: body.status,
      created_at: now,
      updated_at: now,
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
