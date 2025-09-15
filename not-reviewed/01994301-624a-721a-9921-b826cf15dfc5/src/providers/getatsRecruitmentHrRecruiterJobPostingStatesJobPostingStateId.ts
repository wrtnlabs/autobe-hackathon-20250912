import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve the details of a job posting state from
 * ats_recruitment_job_posting_states by ID.
 *
 * Retrieves the full record for a specified job posting state, including all
 * attributes defined in the Prisma schema: state_code, label, description,
 * is_active, sort_order, and audit timestamps. Access control ensures only
 * system administrators or HR recruiters can use this endpoint, maintaining the
 * integrity of recruitment workflow definitions.
 *
 * Expected use cases include loading state details for editing or review,
 * rendering forms for status selection, or verifying workflow constraints.
 * Error cases include invalid or non-existent IDs, permission denials, and
 * failures to access the database.
 *
 * @param props - Object with HR recruiter payload and job posting state ID
 * @param props.hrRecruiter - Authenticated HR recruiter payload
 * @param props.jobPostingStateId - Unique identifier for the job posting state
 *   to retrieve
 * @returns The full business and metadata record of the specified job posting
 *   state
 * @throws {Error} When the job posting state is not found or has been soft
 *   deleted
 */
export async function getatsRecruitmentHrRecruiterJobPostingStatesJobPostingStateId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobPostingState> {
  const { jobPostingStateId } = props;
  const state =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
      where: {
        id: jobPostingStateId,
        deleted_at: null,
      },
    });
  if (!state) {
    throw new Error("Job posting state not found");
  }
  return {
    id: state.id,
    state_code: state.state_code,
    label: state.label,
    description: state.description ?? undefined,
    is_active: state.is_active,
    sort_order: state.sort_order,
    created_at: toISOStringSafe(state.created_at),
    updated_at: toISOStringSafe(state.updated_at),
    deleted_at: state.deleted_at
      ? toISOStringSafe(state.deleted_at)
      : undefined,
  };
}
