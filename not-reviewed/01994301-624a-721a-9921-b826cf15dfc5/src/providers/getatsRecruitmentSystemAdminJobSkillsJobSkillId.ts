import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information about a specific job skill
 * (ats_recruitment_job_skills table).
 *
 * Returns all fields for a single job skill entity from the
 * ats_recruitment_job_skills table, as referenced by its jobSkillId path
 * parameter. The record includes the skill name, full description, activation
 * status, creation and update timestamps, and any notes.
 *
 * Restricted to system administrators for security and data integrity. Used for
 * skill management workflows, such as review before editing or deprecation, and
 * forms the basis for editing dialogs in the admin UI.
 *
 * If the jobSkillId does not exist or if the record has been deleted, a 404
 * error is returned. Data access is logged for compliance.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.jobSkillId - Unique identifier (UUID) for the job skill to
 *   retrieve
 * @returns The job skill entity, including all meta fields
 * @throws {Error} When the jobSkillId does not exist or has been deleted
 */
export async function getatsRecruitmentSystemAdminJobSkillsJobSkillId(props: {
  systemAdmin: SystemadminPayload;
  jobSkillId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobSkill> {
  const { jobSkillId } = props;
  const record = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: {
      id: jobSkillId,
      deleted_at: null,
    },
  });
  if (!record) throw new Error("Job skill not found");
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? undefined,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: undefined,
  };
}
