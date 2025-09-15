import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment.
 *
 * This operation retrieves detailed metadata of a proctored exam session
 * identified by `proctoredExamId` within the assessment identified by
 * `assessmentId`.
 *
 * Access is restricted to users authenticated as systemAdmin.
 *
 * @param props - Object containing the systemAdmin payload and path parameters
 * @param props.systemAdmin - The authenticated systemAdmin payload
 * @param props.assessmentId - UUID of the target assessment
 * @param props.proctoredExamId - UUID of the target proctored exam
 * @returns The detailed proctored exam information conforming to
 *   IEnterpriseLmsProctoredExam
 * @throws {Error} Throws if no proctored exam matches the given IDs
 */
export async function getenterpriseLmsSystemAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { systemAdmin, assessmentId, proctoredExamId } = props;

  const result =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
        deleted_at: null,
      },
    });

  return {
    id: result.id,
    assessment_id: result.assessment_id,
    exam_session_id: result.exam_session_id,
    proctor_id: result.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(result.scheduled_at),
    status: result.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
  };
}
