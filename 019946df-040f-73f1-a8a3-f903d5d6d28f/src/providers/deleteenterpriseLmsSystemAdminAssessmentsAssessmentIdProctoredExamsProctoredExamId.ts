import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a proctored exam record identified by proctoredExamId under the
 * specified assessment.
 *
 * Performs a hard deletion from the `enterprise_lms_proctored_exams` table.
 * Only accessible by users with `systemAdmin` authorization.
 *
 * @param props - Object containing system admin details and identifiers.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.assessmentId - UUID of the assessment linked to the proctored
 *   exam.
 * @param props.proctoredExamId - UUID of the proctored exam to be deleted.
 * @returns Void
 * @throws {Error} Throws error if the proctored exam does not exist or is
 *   mismatched.
 */
export async function deleteenterpriseLmsSystemAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
}): Promise<void> {
  const found = await MyGlobal.prisma.enterprise_lms_proctored_exams.findUnique(
    {
      where: { id: props.proctoredExamId },
    },
  );
  if (!found || found.assessment_id !== props.assessmentId) {
    throw new Error("Proctored exam not found");
  }

  await MyGlobal.prisma.enterprise_lms_proctored_exams.delete({
    where: { id: props.proctoredExamId },
  });
}
