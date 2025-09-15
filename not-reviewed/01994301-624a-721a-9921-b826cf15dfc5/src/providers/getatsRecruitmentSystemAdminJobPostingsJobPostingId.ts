import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch a job posting by its ID from ats_recruitment_job_postings.
 *
 * Retrieves all detailed fields (title, description, posting state, HR
 * recruiter reference, employment type, salary ranges, deadlines, visibility,
 * and soft deletion) for a single job posting by unique identifier. This
 * operation allows system administrators privileged access to any job posting,
 * including those marked as soft-deleted (deleted_at set), for complete review
 * or management purposes. Throws an error if job posting does not exist.
 *
 * @param props - Object containing all input parameters
 * @param props.systemAdmin - Authenticated system admin requesting this
 *   operation
 * @param props.jobPostingId - Unique identifier of the job posting to fetch
 * @returns Full job posting detail as IAtsRecruitmentJobPosting
 * @throws {Error} When the specified job posting is not found
 */
export async function getatsRecruitmentSystemAdminJobPostingsJobPostingId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobPosting> {
  const { jobPostingId } = props;
  const job = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
    where: { id: jobPostingId },
    select: {
      id: true,
      hr_recruiter_id: true,
      job_employment_type_id: true,
      job_posting_state_id: true,
      title: true,
      description: true,
      location: true,
      salary_range_min: true,
      salary_range_max: true,
      application_deadline: true,
      is_visible: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!job) {
    throw new Error("Job posting not found");
  }
  return {
    id: job.id,
    hr_recruiter_id: job.hr_recruiter_id,
    job_employment_type_id: job.job_employment_type_id,
    job_posting_state_id: job.job_posting_state_id,
    title: job.title,
    description: job.description,
    location:
      typeof job.location === "undefined"
        ? undefined
        : job.location === null
          ? null
          : job.location,
    salary_range_min:
      typeof job.salary_range_min === "undefined"
        ? undefined
        : job.salary_range_min === null
          ? null
          : job.salary_range_min,
    salary_range_max:
      typeof job.salary_range_max === "undefined"
        ? undefined
        : job.salary_range_max === null
          ? null
          : job.salary_range_max,
    application_deadline:
      typeof job.application_deadline === "undefined"
        ? undefined
        : job.application_deadline === null
          ? null
          : toISOStringSafe(job.application_deadline),
    is_visible: job.is_visible,
    created_at: toISOStringSafe(job.created_at),
    updated_at: toISOStringSafe(job.updated_at),
    deleted_at:
      typeof job.deleted_at === "undefined"
        ? undefined
        : job.deleted_at === null
          ? null
          : toISOStringSafe(job.deleted_at),
  };
}
