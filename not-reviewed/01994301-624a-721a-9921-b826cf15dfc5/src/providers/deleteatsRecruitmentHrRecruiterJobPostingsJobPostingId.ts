import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Soft-delete a job posting in ats_recruitment_job_postings.
 *
 * This operation marks the specified job posting as deleted by setting its
 * deleted_at timestamp, following the soft-deletion policy for recoverability
 * and compliance. Only the posting's owner HR recruiter may perform this
 * action. Attempting to delete a non-existent or already-deleted posting will
 * throw an error.
 *
 * @param props - Object containing all parameters for this operation
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   request
 * @param props.jobPostingId - The ID of the job posting to be soft-deleted
 * @returns Void
 * @throws {Error} If the job posting does not exist
 * @throws {Error} If the posting is already deleted
 * @throws {Error} If the current user is not the owner of this posting
 */
export async function deleteatsRecruitmentHrRecruiterJobPostingsJobPostingId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, jobPostingId } = props;
  // 1. Fetch the job posting by id
  const posting = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
    where: { id: jobPostingId },
  });
  if (!posting) {
    throw new Error("Job posting not found");
  }
  // 2. Check ownership
  if (posting.hr_recruiter_id !== hrRecruiter.id) {
    throw new Error(
      "Forbidden: You do not have permission to delete this posting",
    );
  }
  // 3. Check for already deleted
  if (posting.deleted_at !== null) {
    throw new Error("Job posting already deleted");
  }
  // 4. Set deleted_at timestamp (soft delete)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_job_postings.update({
    where: { id: jobPostingId },
    data: { deleted_at: now },
  });
}
