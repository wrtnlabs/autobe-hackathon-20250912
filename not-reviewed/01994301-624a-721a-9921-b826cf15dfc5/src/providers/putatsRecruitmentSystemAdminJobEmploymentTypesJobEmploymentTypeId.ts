import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a job employment type in the ats_recruitment_job_employment_types
 * table.
 *
 * This endpoint allows a system administrator to update the properties (name,
 * description, is_active) of an existing job employment type, while enforcing
 * uniqueness on the name field and ensuring that deactivation does not affect
 * ongoing job postings. Name updates are checked for uniqueness, and attempts
 * to deactivate an employment type still referenced by open job postings are
 * rejected. Only allowed fields (name, description, is_active) are mutable.
 * Timestamps are handled as ISO 8601 strings only. All business validation flow
 * is respected, and field-level and domain-level constraints are enforced.
 *
 * @param props - SystemAdmin: The authenticated SystemadminPayload for
 *   authorization (must be a valid, active system admin). jobEmploymentTypeId:
 *   The uuid of the job employment type to update. body: New values for name,
 *   description, and/or is_active.
 * @returns The updated job employment type, with all fields populated.
 * @throws {Error} If not found, if name duplication is attempted, or if trying
 *   to deactivate while still referenced by open postings.
 */
export async function putatsRecruitmentSystemAdminJobEmploymentTypesJobEmploymentTypeId(props: {
  systemAdmin: SystemadminPayload;
  jobEmploymentTypeId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobEmploymentType.IUpdate;
}): Promise<IAtsRecruitmentJobEmploymentType> {
  // Fetch current employment type (must not be deleted)
  const current =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: {
        id: props.jobEmploymentTypeId,
        deleted_at: null,
      },
    });
  if (!current) {
    throw new Error("Employment type not found");
  }
  // If name is provided and changed, check uniqueness
  if (props.body.name !== undefined && props.body.name !== current.name) {
    const duplicate =
      await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.jobEmploymentTypeId },
        },
      });
    if (duplicate) {
      throw new Error("Employment type name must be unique.");
    }
  }

  // If is_active is provided and set to false (deactivating), ensure not referenced in open postings
  if (props.body.is_active === false) {
    // Get 'open' state ids
    const openStates =
      await MyGlobal.prisma.ats_recruitment_job_posting_states.findMany({
        where: {
          state_code: "open",
          deleted_at: null,
        },
        select: { id: true },
      });
    const openStateIds = openStates.map((s) => s.id);
    if (openStateIds.length > 0) {
      const inUse =
        await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
          where: {
            job_employment_type_id: props.jobEmploymentTypeId,
            job_posting_state_id: { in: openStateIds },
            is_visible: true,
            deleted_at: null,
          },
        });
      if (inUse) {
        throw new Error(
          "Cannot deactivate employment type: it is referenced by open job postings.",
        );
      }
    }
  }

  // Update record
  const updated =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.update({
      where: { id: props.jobEmploymentTypeId },
      data: {
        name: props.body.name ?? undefined,
        description: props.body.description ?? undefined,
        is_active: props.body.is_active ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
