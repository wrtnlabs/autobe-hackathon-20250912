import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Register a new job posting in ats_recruitment_job_postings.
 *
 * Allows an authenticated HR recruiter to register a job posting for a
 * position, specifying all business-required fields per schema and DTO. System
 * timestamps and unique ids generated at creation. All optional and nullable
 * fields are handled precisely.
 *
 * @param props - The input containing hrRecruiter auth context and creation
 *   body.
 * @returns The full, newly created job posting per IAtsRecruitmentJobPosting,
 *   with all Date fields as ISO strings.
 * @throws {Error} On FK missing, unique title per recruiter violation, or
 *   schema validation failures (propagated from DB).
 */
export async function postatsRecruitmentHrRecruiterJobPostings(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobPosting.ICreate;
}): Promise<IAtsRecruitmentJobPosting> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const uuid: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.ats_recruitment_job_postings.create({
    data: {
      id: uuid,
      hr_recruiter_id: props.hrRecruiter.id,
      job_employment_type_id: props.body.job_employment_type_id,
      job_posting_state_id: props.body.job_posting_state_id,
      title: props.body.title,
      description: props.body.description,
      location: props.body.location ?? null,
      salary_range_min: props.body.salary_range_min ?? null,
      salary_range_max: props.body.salary_range_max ?? null,
      application_deadline: props.body.application_deadline ?? null,
      is_visible: props.body.is_visible,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    hr_recruiter_id: created.hr_recruiter_id,
    job_employment_type_id: created.job_employment_type_id,
    job_posting_state_id: created.job_posting_state_id,
    title: created.title,
    description: created.description,
    location: created.location ?? null,
    salary_range_min: created.salary_range_min ?? null,
    salary_range_max: created.salary_range_max ?? null,
    application_deadline: created.application_deadline ?? null,
    is_visible: created.is_visible,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
