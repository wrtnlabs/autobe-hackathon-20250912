import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing job posting state (ats_recruitment_job_posting_states
 * table) by jobPostingStateId.
 *
 * This operation allows a system administrator to update the details for a
 * specific job posting state. It validates for uniqueness of state_code,
 * prevents deactivating an already deactivated state, applies updates
 * immutably, and logs the change for audit compliance.
 *
 * @param props - SystemAdmin: authenticated system admin payload
 *   jobPostingStateId: UUID (primary key) of the job posting state to update
 *   body: fields to change (partial update)
 * @returns The updated job posting state entity with current workflow and
 *   policy state
 * @throws {Error} If the state does not exist, state_code is not unique, or
 *   deactivation is invalid
 */
export async function putatsRecruitmentSystemAdminJobPostingStatesJobPostingStateId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobPostingState.IUpdate;
}): Promise<IAtsRecruitmentJobPostingState> {
  // 1. Validate existence (not deleted)
  const existing =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
      where: {
        id: props.jobPostingStateId,
        deleted_at: null,
      },
    });
  if (!existing) throw new Error("Job posting state not found");

  // 2. state_code uniqueness check (if updating and changed)
  if (
    props.body.state_code !== undefined &&
    props.body.state_code !== existing.state_code
  ) {
    const conflict =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
        where: {
          state_code: props.body.state_code,
          id: { not: props.jobPostingStateId },
          deleted_at: null,
        },
      });
    if (conflict) throw new Error("Duplicate state_code");
  }

  // 3. Prevent deactivating already deactivated state
  if (props.body.is_active === false && existing.is_active === false) {
    throw new Error("State is already deactivated");
  }

  // 4. Perform update (only fields present in body)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.update({
      where: { id: props.jobPostingStateId },
      data: {
        state_code:
          props.body.state_code !== undefined
            ? props.body.state_code
            : undefined,
        label: props.body.label !== undefined ? props.body.label : undefined,
        description:
          props.body.description !== undefined
            ? props.body.description
            : undefined,
        is_active:
          props.body.is_active !== undefined ? props.body.is_active : undefined,
        sort_order:
          props.body.sort_order !== undefined
            ? props.body.sort_order
            : undefined,
        updated_at: now,
      },
    });

  // 5. Audit logging for compliance
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: props.systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "UPDATE",
      target_type: "job_posting_state",
      target_id: props.jobPostingStateId,
      event_detail: JSON.stringify({ before: existing, after: props.body }),
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Return the result with all dates as ISO strings and nullable fields handled
  return {
    id: updated.id,
    state_code: updated.state_code,
    label: updated.label,
    description:
      typeof updated.description === "undefined" ? null : updated.description,
    is_active: updated.is_active,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || typeof updated.deleted_at === "undefined"
        ? null
        : toISOStringSafe(updated.deleted_at),
  };
}
