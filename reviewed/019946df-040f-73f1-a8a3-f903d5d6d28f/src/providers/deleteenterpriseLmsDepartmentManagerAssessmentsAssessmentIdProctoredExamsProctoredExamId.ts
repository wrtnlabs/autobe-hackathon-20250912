import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Deletes a proctored exam in the Enterprise LMS identified by
 * 'proctoredExamId' under the assessment with 'assessmentId'.
 *
 * This operation performs a hard delete of the proctored exam record from the
 * database. Only authorized department managers can invoke this operation.
 *
 * @param props - The props object containing necessary parameters.
 * @param props.departmentManager - The authenticated department manager
 *   performing the deletion.
 * @param props.assessmentId - The UUID of the assessment to which the proctored
 *   exam belongs.
 * @param props.proctoredExamId - The UUID of the proctored exam to be deleted.
 * @throws {Error} Throws if the proctored exam does not exist or does not
 *   belong to the specified assessment.
 */
export async function deleteenterpriseLmsDepartmentManagerAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  departmentManager: DepartmentmanagerPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentManager, assessmentId, proctoredExamId } = props;

  // Verify that the proctored exam exists
  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findUniqueOrThrow({
      where: { id: proctoredExamId },
    });

  // Check that the proctored exam is under the specified assessment
  if (proctoredExam.assessment_id !== assessmentId) {
    throw new Error("Proctored exam does not belong to specified assessment");
  }

  // Perform hard delete of the proctored exam
  await MyGlobal.prisma.enterprise_lms_proctored_exams.delete({
    where: { id: proctoredExamId },
  });
}
