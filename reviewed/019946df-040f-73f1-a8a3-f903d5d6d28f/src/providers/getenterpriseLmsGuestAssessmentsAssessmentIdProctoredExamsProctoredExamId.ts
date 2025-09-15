import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment
 *
 * Retrieves a proctored exam identified by its proctoredExamId and
 * assessmentId. Only non-deleted active records are considered.
 *
 * @param props - Object containing guest authentication payload and path
 *   parameters
 * @param props.guest - The authenticated guest user
 * @param props.assessmentId - UUID of the assessment
 * @param props.proctoredExamId - UUID of the proctored exam
 * @returns Detailed proctored exam data conforming to
 *   IEnterpriseLmsProctoredExam
 * @throws {Error} If the proctored exam is not found
 */
export async function getenterpriseLmsGuestAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  guest: GuestPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { guest, assessmentId, proctoredExamId } = props;

  const record = await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirst(
    {
      where: {
        assessment_id: assessmentId,
        id: proctoredExamId,
        deleted_at: null,
      },
    },
  );

  if (!record) {
    throw new Error("Proctored exam not found");
  }

  return {
    id: record.id,
    assessment_id: record.assessment_id,
    exam_session_id: record.exam_session_id,
    proctor_id: record.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(record.scheduled_at),
    status: record.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
