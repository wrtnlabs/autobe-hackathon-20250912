import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently erases a coding test result from the
 * ats_recruitment_coding_test_results table.
 *
 * This function performs a soft delete by setting the deleted_at field to the
 * current timestamp (ISO 8601 string). Only system administrators are
 * authorized to invoke this operation. The result must match all scoped IDs and
 * not already be deleted. If no record is found, an error is thrown. No
 * response is returned on success.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: The authenticated system admin user (SystemadminPayload)
 *   - CodingTestId: The coding test's UUID
 *   - SubmissionId: The coding test submission's UUID
 *   - ResultId: The coding test result's UUID
 *
 * @returns Void (no response body)
 * @throws {Error} If the result does not exist or has already been deleted
 */
export async function deleteatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, codingTestId, submissionId, resultId } = props;

  // Find the result. Must exist and not already deleted
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: resultId,
        ats_recruitment_coding_test_id: codingTestId,
        ats_recruitment_coding_test_submission_id: submissionId,
        deleted_at: null,
      },
    });

  if (result === null) {
    throw new Error("Coding test result not found");
  }

  // Soft delete (update deleted_at to now as string & tags.Format<'date-time'>)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ats_recruitment_coding_test_results.update({
    where: { id: resultId },
    data: { deleted_at: deletedAt },
  });

  // Void response for DELETE
  return;
}
