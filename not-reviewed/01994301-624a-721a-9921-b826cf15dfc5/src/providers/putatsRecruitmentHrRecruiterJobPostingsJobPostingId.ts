import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update a job posting by ID in ats_recruitment_job_postings.
 *
 * This endpoint allows authorized HR users to update fields of a job posting
 * they own, including title, description, employment type, posting state,
 * location, salary ranges, deadline, and visibility. HR recruiter must own the
 * posting and not be deleted. All validations are enforced including title
 * uniqueness for the recruiter, existence and active status of referenced
 * employment type and state, and atomic update timestamping.
 *
 * @param props - Update properties
 * @param props.hrRecruiter - HR recruiter acting as modifier (must own the
 *   posting)
 * @param props.jobPostingId - Target job posting id (primary key, UUID)
 * @param props.body - Fields to update as per IAtsRecruitmentJobPosting.IUpdate
 * @returns IAtsRecruitmentJobPosting - The updated job posting object
 * @throws {Error} If posting not found, forbidden, validation errors
 */
export async function putatsRecruitmentHrRecruiterJobPostingsJobPostingId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobPosting.IUpdate;
}): Promise<IAtsRecruitmentJobPosting> {
  const { hrRecruiter, jobPostingId, body } = props;
  // Find posting owned by this recruiter and not deleted
  const posting =
    await MyGlobal.prisma.ats_recruitment_job_postings.findFirstOrThrow({
      where: {
        id: jobPostingId,
        hr_recruiter_id: hrRecruiter.id,
        deleted_at: null,
      },
    });
  // If updating title, ensure it is unique for this recruiter
  if (body.title !== undefined) {
    const conflict =
      await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
        where: {
          hr_recruiter_id: hrRecruiter.id,
          title: body.title,
          id: { not: jobPostingId },
          deleted_at: null,
        },
      });
    if (conflict) throw new Error("Duplicate title for recruiter");
  }
  // If changing employment type, ensure it exists and is active
  if (body.job_employment_type_id !== undefined) {
    const et =
      await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
        where: {
          id: body.job_employment_type_id,
          is_active: true,
          deleted_at: null,
        },
      });
    if (!et) throw new Error("Invalid employment type");
  }
  // If changing posting state, ensure it exists and is active
  if (body.job_posting_state_id !== undefined) {
    const st =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
        where: {
          id: body.job_posting_state_id,
          is_active: true,
          deleted_at: null,
        },
      });
    if (!st) throw new Error("Invalid posting state");
  }
  // Prepare update input (omit undefined, pass nulls for nullable fields)
  const updates: Record<string, unknown> = {
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
      application_deadline:
        body.application_deadline !== null
          ? toISOStringSafe(body.application_deadline)
          : null,
    }),
    ...(body.is_visible !== undefined && { is_visible: body.is_visible }),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.ats_recruitment_job_postings.update({
    where: { id: jobPostingId },
    data: updates,
  });
  return {
    id: updated.id,
    hr_recruiter_id: updated.hr_recruiter_id,
    job_employment_type_id: updated.job_employment_type_id,
    job_posting_state_id: updated.job_posting_state_id,
    title: updated.title,
    description: updated.description,
    location: updated.location ?? null,
    salary_range_min: updated.salary_range_min ?? null,
    salary_range_max: updated.salary_range_max ?? null,
    application_deadline: updated.application_deadline
      ? toISOStringSafe(updated.application_deadline)
      : null,
    is_visible: updated.is_visible,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
