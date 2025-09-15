import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Fetch a job posting by its ID from ats_recruitment_job_postings.
 *
 * Retrieves a detailed job posting for an authenticated HR recruiter, enforcing
 * ownership and access controls. Returns all business fields, converting all
 * date types and preserving null/optional as per DTO spec. Soft-deleted records
 * are excluded.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter (must own the
 *   posting)
 * @param props.jobPostingId - Unique identifier of the job posting to fetch
 * @returns Detailed job posting information for the specified ID
 * @throws {Error} If posting does not exist, is soft-deleted, or is not owned
 *   by this HR recruiter
 */
export async function getatsRecruitmentHrRecruiterJobPostingsJobPostingId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobPosting> {
  const posting = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
    where: {
      id: props.jobPostingId,
      deleted_at: null,
      hr_recruiter_id: props.hrRecruiter.id,
    },
  });

  if (!posting) {
    throw new Error("Job posting not found or access denied");
  }

  return {
    id: posting.id,
    hr_recruiter_id: posting.hr_recruiter_id,
    job_employment_type_id: posting.job_employment_type_id,
    job_posting_state_id: posting.job_posting_state_id,
    title: posting.title,
    description: posting.description,
    location: posting.location ?? undefined,
    salary_range_min: posting.salary_range_min ?? undefined,
    salary_range_max: posting.salary_range_max ?? undefined,
    application_deadline:
      posting.application_deadline !== null &&
      posting.application_deadline !== undefined
        ? toISOStringSafe(posting.application_deadline)
        : undefined,
    is_visible: posting.is_visible,
    created_at: toISOStringSafe(posting.created_at),
    updated_at: toISOStringSafe(posting.updated_at),
    deleted_at:
      posting.deleted_at !== null && posting.deleted_at !== undefined
        ? toISOStringSafe(posting.deleted_at)
        : undefined,
  };
}
