import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new job posting state (ats_recruitment_job_posting_states table) for
 * the ATS workflow.
 *
 * This operation allows system administrators to add a new job posting state to
 * the ATS platform, supporting workflow stages such as 'Open', 'Paused', or
 * custom status for recruitment process management. It enforces uniqueness on
 * the machine-friendly state code, accepts meaningful label and description,
 * sets activation and sort order, and includes audit timestamps. Only
 * authenticated systemadmin users may create states.
 *
 * All creations are tracked for compliance and will trigger a unique constraint
 * error if state_code is duplicated. Description is optional; if omitted, it is
 * stored and returned as null. All timestamps use ISO date-time string format.
 *
 * @param props - SystemAdmin: The authenticated system administrator
 *   (SystemadminPayload) body: The data required to create the new job posting
 *   state (IAtsRecruitmentJobPostingState.ICreate)
 * @returns Details of the created job posting state, including all fields per
 *   API contract
 * @throws {Prisma.PrismaClientKnownRequestError} If a unique constraint
 *   (state_code) violation occurs
 */
export async function postatsRecruitmentSystemAdminJobPostingStates(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobPostingState.ICreate;
}): Promise<IAtsRecruitmentJobPostingState> {
  const { body } = props;

  // Prepare ISO timestamps for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new job posting state row (Prisma unique constraint will error on duplicates)
  const created =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        state_code: body.state_code,
        label: body.label,
        description: body.description ?? null,
        is_active: body.is_active,
        sort_order: body.sort_order,
        created_at: now,
        updated_at: now,
      },
    });

  // Return result matching IAtsRecruitmentJobPostingState interface (deleted_at always null on creation)
  return {
    id: created.id,
    state_code: created.state_code,
    label: created.label,
    description: created.description ?? null,
    is_active: created.is_active,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
