import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update an existing job posting state (ats_recruitment_job_posting_states
 * table) by jobPostingStateId.
 *
 * This operation allows authorized HR recruiters or system administrators to
 * update details of a specific job posting state in the ATS recruitment system
 * by its unique identifier. Fields that may be updated include the label,
 * description, state_code, activation status, or sort order for a workflow
 * state, ensuring continuous adaptation of recruitment processes and
 * administrative policy.
 *
 * Authentication: Only users with hrRecruiter or systemAdmin privileges are
 * allowed. All update actions are logged for compliance.
 *
 * @param props - Properties for the update operation
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 * @param props.jobPostingStateId - UUID of the job posting state to update
 * @param props.body - Update data conforming to
 *   IAtsRecruitmentJobPostingState.IUpdate
 * @returns The updated job posting state entity
 * @throws {Error} When the posting state does not exist
 * @throws {Error} When attempting to update state_code to a non-unique value
 * @throws {Error} When attempting to set an illegal or duplicate sort_order
 */
export async function putatsRecruitmentHrRecruiterJobPostingStatesJobPostingStateId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobPostingState.IUpdate;
}): Promise<IAtsRecruitmentJobPostingState> {
  const { hrRecruiter, jobPostingStateId, body } = props;

  // Step 1: Find existing state (and ensure not deleted)
  const existing =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
      where: { id: jobPostingStateId, deleted_at: null },
    });
  if (!existing) throw new Error("Job posting state not found");

  // Step 2: If updating state_code, enforce uniqueness (excluding self)
  if (body.state_code !== undefined) {
    const duplicateStateCode =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
        where: {
          state_code: body.state_code,
          id: { not: jobPostingStateId },
          deleted_at: null,
        },
      });
    if (duplicateStateCode) throw new Error("Duplicate state_code");
  }

  // Step 3: If updating sort_order, enforce uniqueness/conflict avoidance (excluding self)
  if (body.sort_order !== undefined) {
    const duplicateSortOrder =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
        where: {
          sort_order: body.sort_order,
          id: { not: jobPostingStateId },
          deleted_at: null,
        },
      });
    if (duplicateSortOrder) throw new Error("Duplicate sort_order");
  }

  // Step 4: Perform the update (only provided fields, always update updated_at)
  const updateData = {
    ...(body.state_code !== undefined && { state_code: body.state_code }),
    ...(body.label !== undefined && { label: body.label }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.update({
      where: { id: jobPostingStateId },
      data: updateData,
    });

  // Step 5: Map all fields to DTO, guaranteeing required / optional field conformance, converting dates, handling nulls
  return {
    id: updated.id,
    state_code: updated.state_code,
    label: updated.label,
    description: updated.description === null ? undefined : updated.description,
    is_active: updated.is_active,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  } satisfies IAtsRecruitmentJobPostingState;
}
