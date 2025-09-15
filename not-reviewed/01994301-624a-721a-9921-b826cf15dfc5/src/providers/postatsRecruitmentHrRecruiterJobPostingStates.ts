import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new job posting state (ats_recruitment_job_posting_states table) for
 * the ATS workflow.
 *
 * This operation allows authenticated HR recruiters to define a new workflow
 * state, such as 'paused', 'archived', or 'custom', for job postings in the
 * recruitment management platform. It enforces uniqueness on the machine code,
 * supports documentation via description and label, and ensures auditability
 * with generated timestamps and IDs.
 *
 * Only authenticated HR recruiters can access this operation. Duplicated state
 * codes will result in an error. All successful creations are audit-logged and
 * returned with all metadata fields.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter creating the job
 *   posting state
 * @param props.body - The job posting state creation data (state_code, label,
 *   description?, is_active, sort_order)
 * @returns The created job posting state entity, with id, state code, label,
 *   activation, sorting, and audit fields.
 * @throws {Error} If a state with the given state_code already exists, or on DB
 *   constraint violation.
 */
export async function postatsRecruitmentHrRecruiterJobPostingStates(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobPostingState.ICreate;
}): Promise<IAtsRecruitmentJobPostingState> {
  const now = toISOStringSafe(new Date());

  // Pre-check: Ensure unique state_code to provide clear error
  const exists =
    await MyGlobal.prisma.ats_recruitment_job_posting_states.findFirst({
      where: { state_code: props.body.state_code },
    });
  if (exists) {
    throw new Error("A job posting state with this state_code already exists");
  }

  try {
    const created =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          state_code: props.body.state_code,
          label: props.body.label,
          description: props.body.description ?? null,
          is_active: props.body.is_active,
          sort_order: props.body.sort_order,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    return {
      id: created.id,
      state_code: created.state_code,
      label: created.label,
      description: created.description ?? undefined,
      is_active: created.is_active,
      sort_order: created.sort_order,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (error: unknown) {
    // In case of race: Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "A job posting state with this state_code already exists",
      );
    }
    throw error;
  }
}
