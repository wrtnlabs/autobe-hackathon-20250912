import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve the details of a job posting state from
 * ats_recruitment_job_posting_states by ID.
 *
 * Retrieves the full record for a specified job posting state, including all
 * attributes defined in the Prisma schema: state_code, label, description,
 * is_active, sort_order, and audit timestamps. Access control ensures only
 * system administrators can use this endpoint, maintaining the integrity of
 * recruitment workflow definitions.
 *
 * Expected use cases include loading state details for editing or review,
 * rendering forms for status selection, or verifying workflow constraints.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system administrator user (enforced
 *   upstream)
 * @param props.jobPostingStateId - UUID of the job posting state to retrieve
 * @returns The requested IAtsRecruitmentJobPostingState
 * @throws {Error} If the job posting state does not exist
 */
export async function getatsRecruitmentSystemAdminJobPostingStatesJobPostingStateId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobPostingState> {
  const { jobPostingStateId } = props;
  const state =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
      where: { id: jobPostingStateId },
    });
  if (!state) throw new Error("Job posting state not found");
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
