import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Permanently erases a coding test result from the system (soft delete if
 * supported).
 *
 * This endpoint enables technical reviewers to remove a coding test result via
 * soft deletion (setting deleted_at timestamp), provided that the result exists
 * and matches all identifiers. The operation is strictly controlled, and logs
 * the erasure event in the audit trail for compliance. If the result is already
 * deleted or missing, an error is thrown. No response body is returned on
 * successful completion.
 *
 * Authorization is enforced for the techReviewer role (via TechreviewerPayload
 * parameter). Operation is fully audited for compliance.
 *
 * @param props - The request properties
 * @param props.techReviewer - Authenticated TechreviewerPayload (actor for the
 *   operation)
 * @param props.codingTestId - Unique coding test UUID
 * @param props.submissionId - Unique submission UUID
 * @param props.resultId - Unique result UUID (primary key)
 * @returns Void (no content on success)
 * @throws {Error} If result does not exist or has already been deleted
 */
export async function deleteatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdResultsResultId(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  resultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { techReviewer, codingTestId, submissionId, resultId } = props;

  // Find the result, match all three IDs for business integrity
  const result =
    await MyGlobal.prisma.ats_recruitment_coding_test_results.findFirst({
      where: {
        id: resultId,
        ats_recruitment_coding_test_id: codingTestId,
        ats_recruitment_coding_test_submission_id: submissionId,
      },
    });
  if (!result || result.deleted_at !== null) {
    throw new Error("Result not found or already deleted");
  }

  // Soft delete (set deleted_at), always audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_coding_test_results.update({
    where: { id: resultId },
    data: { deleted_at: now },
  });

  // Log in audit trail for compliance/forensics
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: techReviewer.id,
      actor_role: techReviewer.type,
      operation_type: "DELETE",
      target_type: "coding_test_result",
      target_id: resultId,
      event_detail: `Coding test result erased: codingTestId=${codingTestId}, submissionId=${submissionId} by techReviewer: ${techReviewer.id}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // No return needed for void
}
