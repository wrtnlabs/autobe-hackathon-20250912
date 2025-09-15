import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific assessment result by assessmentId and resultId.
 *
 * This operation permanently deletes the assessment result from the database.
 * It ensures the record exists before deletion and throws an error if not
 * found. Only authenticated systemAdmin users can perform this operation.
 *
 * @param props - Parameters including systemAdmin authentication and target ids
 * @param props.systemAdmin - The authenticated systemAdmin performing deletion
 * @param props.assessmentId - The UUID of the assessment
 * @param props.resultId - The UUID of the assessment result to be deleted
 * @returns Void
 * @throws {Error} When the assessment result does not exist
 */
export async function deleteenterpriseLmsSystemAdminAssessmentsAssessmentIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, assessmentId, resultId } = props;

  await MyGlobal.prisma.enterprise_lms_assessment_results.findFirstOrThrow({
    where: {
      id: resultId,
      assessment_id: assessmentId,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.enterprise_lms_assessment_results.delete({
    where: { id: resultId },
  });
}
