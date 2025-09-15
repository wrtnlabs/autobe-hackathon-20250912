import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Create a new proctored exam session linked to a specified assessment.
 *
 * This function verifies the authenticated department manager's tenant
 * ownership of the assessment before creating a new proctored exam. It handles
 * all required properties, generates a UUID for the new record, and sets
 * creation and update timestamps.
 *
 * @param props - Object containing the department manager's payload, assessment
 *   ID, and creation body
 * @returns The newly created proctored exam session with fully typed date
 *   strings
 * @throws {Error} Throws if the assessment does not exist or does not belong to
 *   the user's tenant
 */
export async function postenterpriseLmsDepartmentManagerAssessmentsAssessmentIdProctoredExams(props: {
  departmentManager: DepartmentmanagerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.ICreate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { departmentManager, assessmentId, body } = props;

  // Verify assessment belongs to the departmentManager's tenant
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUnique({
      where: { id: assessmentId },
      select: { tenant_id: true },
    });

  if (!assessment) {
    throw new Error(`Assessment with id ${assessmentId} not found`);
  }

  if (assessment.tenant_id !== departmentManager.tenant_id) {
    throw new Error("Unauthorized: Assessment does not belong to your tenant");
  }

  // Prepare id and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the proctored exam record
  const created = await MyGlobal.prisma.enterprise_lms_proctored_exams.create({
    data: {
      id,
      assessment_id: assessmentId,
      exam_session_id: body.exam_session_id,
      proctor_id: body.proctor_id ?? null,
      scheduled_at: toISOStringSafe(body.scheduled_at),
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created entity with proper date strings and nullable handling
  return {
    id: created.id as string & tags.Format<"uuid">,
    assessment_id: created.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: created.exam_session_id,
    proctor_id: created.proctor_id ?? undefined,
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
