import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a job posting by ID in ats_recruitment_job_postings.
 *
 * Allows system administrators to update any allowed fields of a job posting
 * entity, identified by jobPostingId, while enforcing business rules:
 * referential integrity (employment type/state must exist and not be deleted),
 * unique recruiter-title constraint, and field type/date handling. Updates are
 * patch-style (only submitted fields are changed), and the updated_at field is
 * always refreshed. All date/datetime values are ISO 8601 strings with branded
 * types, and null/undefined are handled per API contract. Throws clear errors
 * for not found, bad reference, or unique constraint violations.
 *
 * @param props - Parameters for the update
 * @param props.systemAdmin - The authenticated system administrator making the
 *   update
 * @param props.jobPostingId - The UUID of the job posting to update
 * @param props.body - Partially-filled update request per
 *   IAtsRecruitmentJobPosting.IUpdate
 * @returns The updated job posting as IAtsRecruitmentJobPosting
 * @throws {Error} When not found, foreign key missing/invalid, or title not
 *   unique
 */
export async function putatsRecruitmentSystemAdminJobPostingsJobPostingId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobPosting.IUpdate;
}): Promise<IAtsRecruitmentJobPosting> {
  const { systemAdmin, jobPostingId, body } = props;
  // 1. Fetch job posting (must exist, not deleted)
  const posting = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
    where: { id: jobPostingId, deleted_at: null },
  });
  if (!posting) throw new Error("Job posting not found");

  // 2. Referential integrity: employment type, posting state exist and not deleted
  if (body.job_employment_type_id !== undefined) {
    const exists =
      await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
        where: { id: body.job_employment_type_id, deleted_at: null },
      });
    if (!exists) throw new Error("Invalid job_employment_type_id");
  }
  if (body.job_posting_state_id !== undefined) {
    const exists =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
        where: { id: body.job_posting_state_id, deleted_at: null },
      });
    if (!exists) throw new Error("Invalid job_posting_state_id");
  }
  // 3. Uniqueness: recruiter-title must be unique (except self)
  if (
    body.title !== undefined &&
    body.title !== posting.title &&
    body.title.length > 0
  ) {
    const dup = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
      where: {
        hr_recruiter_id: posting.hr_recruiter_id,
        title: body.title,
        deleted_at: null,
        NOT: { id: posting.id },
      },
    });
    if (dup) throw new Error("Title must be unique for recruiter");
  }

  // 4. Patch semantics: only send changed fields
  const updated = await MyGlobal.prisma.ats_recruitment_job_postings.update({
    where: { id: posting.id },
    data: {
      ...(body.job_employment_type_id !== undefined && {
        job_employment_type_id: body.job_employment_type_id,
      }),
      ...(body.job_posting_state_id !== undefined && {
        job_posting_state_id: body.job_posting_state_id,
      }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.salary_range_min !== undefined && {
        salary_range_min: body.salary_range_min,
      }),
      ...(body.salary_range_max !== undefined && {
        salary_range_max: body.salary_range_max,
      }),
      ...(body.application_deadline !== undefined && {
        application_deadline: body.application_deadline,
      }),
      ...(body.is_visible !== undefined && { is_visible: body.is_visible }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    hr_recruiter_id: updated.hr_recruiter_id,
    job_employment_type_id: updated.job_employment_type_id,
    job_posting_state_id: updated.job_posting_state_id,
    title: updated.title,
    description: updated.description,
    location: updated.location ?? undefined,
    salary_range_min: updated.salary_range_min ?? undefined,
    salary_range_max: updated.salary_range_max ?? undefined,
    application_deadline: updated.application_deadline
      ? toISOStringSafe(updated.application_deadline)
      : undefined,
    is_visible: updated.is_visible,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
