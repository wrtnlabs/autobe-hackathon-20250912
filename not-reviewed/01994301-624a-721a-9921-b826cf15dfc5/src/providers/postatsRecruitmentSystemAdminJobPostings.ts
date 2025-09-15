import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Register a new job posting in ats_recruitment_job_postings.
 *
 * This function creates a new job posting record in the ATS system using the
 * provided business information. It enforces required fields, references to HR
 * recruiter, employment type, job state, and sets all timestamps in ISO8601
 * string format. All business constraints are assumed to have been validated
 * prior to this call.
 *
 * @param props - Function arguments
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Job posting creation data: includes title, description,
 *   hr recruiter reference, employment type, posting state, optional fields and
 *   visibility
 * @returns The newly created job posting record
 * @throws {Error} If Prisma create fails due to constraint violation or
 *   business error
 */
export async function postatsRecruitmentSystemAdminJobPostings(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobPosting.ICreate;
}): Promise<IAtsRecruitmentJobPosting> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ats_recruitment_job_postings.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hr_recruiter_id: props.body.hr_recruiter_id,
      job_employment_type_id: props.body.job_employment_type_id,
      job_posting_state_id: props.body.job_posting_state_id,
      title: props.body.title,
      description: props.body.description,
      location: props.body.location ?? undefined,
      salary_range_min: props.body.salary_range_min ?? undefined,
      salary_range_max: props.body.salary_range_max ?? undefined,
      application_deadline: props.body.application_deadline ?? undefined,
      is_visible: props.body.is_visible,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    hr_recruiter_id: created.hr_recruiter_id,
    job_employment_type_id: created.job_employment_type_id,
    job_posting_state_id: created.job_posting_state_id,
    title: created.title,
    description: created.description,
    location: created.location ?? undefined,
    salary_range_min: created.salary_range_min ?? undefined,
    salary_range_max: created.salary_range_max ?? undefined,
    application_deadline: created.application_deadline
      ? toISOStringSafe(created.application_deadline)
      : undefined,
    is_visible: created.is_visible,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
