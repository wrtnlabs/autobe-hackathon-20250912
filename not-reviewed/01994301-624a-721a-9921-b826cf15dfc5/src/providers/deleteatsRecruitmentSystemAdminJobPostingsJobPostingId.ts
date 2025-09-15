import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a job posting in ats_recruitment_job_postings.
 *
 * This endpoint marks a job posting as deleted by setting its deleted_at
 * timestamp, following the soft-deletion policy described in the
 * ats_recruitment_job_postings schema. This action is intended to hide the
 * posting from most business workflows, UI, and public listings, without
 * removing the data physically from storage—allowing for possible recovery and
 * ensuring compliance with audit policies.
 *
 * Only system administrators may perform this operation. Attempts to delete
 * already deleted postings will be idempotent (no error, no re-deletion).
 *
 * @param props - Object containing parameters for deleting the job posting
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.jobPostingId - The ID of the job posting to be soft-deleted
 * @returns Void
 * @throws {Error} When the job posting does not exist
 */
export async function deleteatsRecruitmentSystemAdminJobPostingsJobPostingId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch posting by id and check for existence
  const posting = await MyGlobal.prisma.ats_recruitment_job_postings.findUnique(
    {
      where: { id: props.jobPostingId },
      select: { id: true, deleted_at: true },
    },
  );
  if (!posting) {
    throw new Error("Job posting not found");
  }

  // Step 2: Idempotency: already deleted → do nothing
  if (posting.deleted_at !== null) {
    return;
  }

  // Step 3: Perform soft delete (set deleted_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_job_postings.update({
    where: { id: props.jobPostingId },
    data: { deleted_at: now },
  });
}
