import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new proctored exam session linked to a specific assessment.
 *
 * This operation creates a proctored exam with all required metadata, including
 * scheduling, proctor assignment, and status management. It ensures the linked
 * assessment exists and associates the exam properly.
 *
 * @param props - Object containing the system admin payload, assessment ID, and
 *   exam creation body
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.assessmentId - The UUID of the assessment to link the exam with
 * @param props.body - The proctored exam creation data conforming to
 *   IEnterpriseLmsProctoredExam.ICreate
 * @returns The created proctored exam session data
 * @throws {Error} Throws if the assessment does not exist
 */
export async function postenterpriseLmsSystemAdminAssessmentsAssessmentIdProctoredExams(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { systemAdmin, assessmentId, body } = props;

  // Validate existence of the assessment
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUniqueOrThrow({
      where: { id: assessmentId },
      select: { id: true },
    });

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the proctored exam record
  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id: v4(),
      assessment_id: assessmentId,
      exam_session_id: body.exam_session_id,
      proctor_id: body.proctor_id ?? null,
      scheduled_at: body.scheduled_at,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created proctored exam, with dates normalized
  return {
    id: created.id as string & tags.Format<"uuid">,
    assessment_id: created.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: created.exam_session_id,
    proctor_id: created.proctor_id ?? null,
    scheduled_at: created.scheduled_at,
    status: created.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
