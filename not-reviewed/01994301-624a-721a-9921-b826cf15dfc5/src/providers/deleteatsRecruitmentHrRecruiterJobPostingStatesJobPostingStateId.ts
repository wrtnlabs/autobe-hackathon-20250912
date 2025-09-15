import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Permanently delete a job posting state (ats_recruitment_job_posting_states)
 * by jobPostingStateId.
 *
 * This operation irreversibly removes the workflow state identified by its
 * unique jobPostingStateId. It is available only to privileged HR recruiters
 * and system administrators, and only when the state is not referenced by any
 * active or historical job posting. There is no soft delete; the state is truly
 * removed.
 *
 * All actions are logged in ats_recruitment_audit_trails for compliance and
 * operational transparency. Attempts to delete a state that is still in use or
 * does not exist will throw errors.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter performing this
 *   action
 * @param props.jobPostingStateId - UUID of the job posting state to delete
 * @returns Void
 * @throws {Error} If the state is referenced by job postings or not found
 */
export async function deleteatsRecruitmentHrRecruiterJobPostingStatesJobPostingStateId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate that no job postings use this state
  const inUseCount = await MyGlobal.prisma.ats_recruitment_job_postings.count({
    where: { job_posting_state_id: props.jobPostingStateId },
  });
  if (inUseCount > 0) {
    throw new Error(
      "Cannot delete: state is still referenced by existing job postings",
    );
  }
  // 2. Ensure the state exists (throws if not found)
  await MyGlobal.prisma.ats_recruitment_job_posting_states.findUniqueOrThrow({
    where: { id: props.jobPostingStateId },
  });
  // 3. Hard delete the state
  await MyGlobal.prisma.ats_recruitment_job_posting_states.delete({
    where: { id: props.jobPostingStateId },
  });
  // 4. Log to audit trail
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: props.hrRecruiter.id,
      actor_role: "hrRecruiter",
      operation_type: "DELETE",
      target_type: "job_posting_state",
      target_id: props.jobPostingStateId,
      event_detail: JSON.stringify({
        action: "delete",
        jobPostingStateId: props.jobPostingStateId,
      }),
      ip_address: null,
      user_agent: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
