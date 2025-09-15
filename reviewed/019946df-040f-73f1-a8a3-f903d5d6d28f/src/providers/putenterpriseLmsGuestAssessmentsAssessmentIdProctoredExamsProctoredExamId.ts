import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Update an existing proctored exam session by proctoredExamId for a specified
 * assessmentId.
 *
 * This function validates the existence of the proctored exam, ensures the
 * update input follows the IUpdate DTO structure, and updates the provided
 * fields using Prisma client.
 *
 * Date and UUID handling strictly follows the project's conventions, converting
 * dates using toISOStringSafe() and generating UUIDs with v4(), fully avoiding
 * native Date usage.
 *
 * @param props - Object containing guest authentication, assessmentId,
 *   proctoredExamId, and update body
 * @returns Updated proctored exam entity matching IEnterpriseLmsProctoredExam
 * @throws {Error} When the proctored exam for the given IDs does not exist
 */
export async function putenterpriseLmsGuestAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  guest: GuestPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { guest, assessmentId, proctoredExamId, body } = props;

  const existed =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirst({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });
  if (!existed) throw new Error("Proctored exam not found");

  const now = toISOStringSafe(new Date());

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
        body.proctor_id === null ? undefined : (body.proctor_id ?? undefined),
      scheduled_at:
        body.scheduled_at === null
          ? undefined
          : (body.scheduled_at ?? undefined),
      status: body.status === null ? undefined : (body.status ?? undefined),
      updated_at: body.updated_at === null ? now : (body.updated_at ?? now),
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    exam_session_id: updated.exam_session_id,
    proctor_id:
      updated.proctor_id === null ? null : (updated.proctor_id ?? undefined),
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
