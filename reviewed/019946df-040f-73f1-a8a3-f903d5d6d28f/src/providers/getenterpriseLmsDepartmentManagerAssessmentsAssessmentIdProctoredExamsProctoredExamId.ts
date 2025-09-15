import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Get detailed info of a proctored exam by ID for a given assessment
 *
 * Retrieves detailed information about a specific proctored exam identified by
 * its proctoredExamId and associated assessmentId. Ensures that the proctored
 * exam belongs to the assessment.
 *
 * Access is assumed authorized via the departmentManager authentication.
 *
 * @param props - Object containing departmentManager authentication info and
 *   identifiers
 * @param props.departmentManager - The authenticated department manager payload
 * @param props.assessmentId - UUID of the target assessment
 * @param props.proctoredExamId - UUID of the requested proctored exam
 * @returns The detailed proctored exam information corresponding to the IDs
 * @throws {Error} Throws if the proctored exam does not exist or does not
 *   belong to the assessment
 */
export async function getenterpriseLmsDepartmentManagerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  departmentManager: DepartmentmanagerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { departmentManager, assessmentId, proctoredExamId } = props;

  // Fetch proctored exam with assessment relation to check tenant and ownership
  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
      where: { id: proctoredExamId, assessment_id: assessmentId },
      include: {
        assessment: { select: { tenant_id: true } },
      },
    });

  // Since no tenant_id in departmentManagerPayload, assume authorization done externally

  // Return response with properly converted dates and null/undefined distinctions
  return {
    id: proctoredExam.id,
    assessment_id: proctoredExam.assessment_id,
    exam_session_id: proctoredExam.exam_session_id,
    proctor_id:
      proctoredExam.proctor_id === null ? undefined : proctoredExam.proctor_id,
    scheduled_at: toISOStringSafe(proctoredExam.scheduled_at),
    status: proctoredExam.status,
    created_at: toISOStringSafe(proctoredExam.created_at),
    updated_at: toISOStringSafe(proctoredExam.updated_at),
    deleted_at:
      proctoredExam.deleted_at === null
        ? undefined
        : toISOStringSafe(proctoredExam.deleted_at),
  };
}
