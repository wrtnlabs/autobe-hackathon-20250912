import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update the details of a specific job skill (ats_recruitment_job_skills
 * table).
 *
 * This operation updates a job skill entity identified by jobSkillId. It
 * permits changes to the skill's name, description, and activation status. Only
 * non-deleted skills (deleted_at: null) may be updated. Validation includes
 * unique name enforcement and error reporting if the skill does not exist or is
 * already deleted. Updates system managed fields (updated_at) appropriately,
 * and returns the updated entity with all audit/date fields.
 *
 * Authorization: Requires valid SystemadminPayload (systemAdmin prop).
 *
 * @param props - Properties required for the update operation
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   update
 * @param props.jobSkillId - UUID of the job skill to update
 * @param props.body - Fields to update (name, description, is_active)
 * @returns The updated job skill entity
 * @throws {Error} If skill is not found, is deleted, or if a uniqueness
 *   constraint is violated
 */
export async function putatsRecruitmentSystemAdminJobSkillsJobSkillId(props: {
  systemAdmin: SystemadminPayload;
  jobSkillId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobSkill.IUpdate;
}): Promise<IAtsRecruitmentJobSkill> {
  const { jobSkillId, body } = props;

  // 1. Fetch the job skill, only if not soft-deleted
  const skill = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: { id: jobSkillId, deleted_at: null },
  });
  if (!skill) throw new Error("Job skill not found or has been deleted");

  // 2. Enforce uniqueness if new name provided and changed
  if (body.name !== undefined && body.name !== skill.name) {
    const nameConflict =
      await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
        where: {
          name: body.name,
          deleted_at: null,
          id: { not: jobSkillId },
        },
      });
    if (nameConflict)
      throw new Error("A job skill with this name already exists");
  }

  // 3. Build update data with only provided fields, update updated_at
  const updateData = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.ats_recruitment_job_skills.update({
    where: { id: jobSkillId },
    data: updateData,
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description === undefined ? null : updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
