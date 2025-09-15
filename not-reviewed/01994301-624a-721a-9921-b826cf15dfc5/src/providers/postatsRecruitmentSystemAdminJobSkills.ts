import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new job skill for recruitment postings (ats_recruitment_job_skills
 * table).
 *
 * This endpoint allows authenticated system administrators to add a new
 * technology or job skill (e.g., "Python", "React") to the
 * ats_recruitment_job_skills table. The skill name must be unique; an attempt
 * to create a duplicate name will result in an error. All field entries—id,
 * timestamps, name, description, activation—are populated. Creation events are
 * audit-logged and available for downstream skill-matching workflows. Soft
 * deletion is not set for new records. Only accessible by system
 * administrators.
 *
 * @param props - The request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   this operation
 * @param props.body - The skill creation data (name, description, is_active)
 * @returns The newly created job skill entity with metadata according to
 *   IAtsRecruitmentJobSkill
 * @throws {Error} If a job skill with the same name already exists (uniqueness
 *   constraint violation)
 */
export async function postatsRecruitmentSystemAdminJobSkills(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobSkill.ICreate;
}): Promise<IAtsRecruitmentJobSkill> {
  const { body } = props;

  // Uniqueness check: Reject duplicate names that are not deleted
  const existing = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: {
      name: body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error(`Job skill with name '${body.name}' already exists.`);
  }

  // Prepare core fields
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ats_recruitment_job_skills.create({
    data: {
      id: v4(),
      name: body.name,
      description: body.description ?? null,
      is_active: body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
