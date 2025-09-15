import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a job skill from the skill registry
 * (ats_recruitment_job_skills).
 *
 * This API endpoint allows privileged users (such as system administrators) to
 * permanently delete an existing job skill from the ATS system. The operation
 * checks for referential integrity and prevents deletion if the skill is
 * referenced by any application. If the skill does not exist (or is already
 * deleted/soft-deleted), a 404-style error is thrown. If the skill is still in
 * use (referenced by applications), a 409-style error is thrown.
 *
 * Only system administrators may perform the operation. Successful execution
 * completely removes the skill, making it inaccessible for future use.
 *
 * @param props - Request parameters
 * @param props.systemAdmin - Authenticated SystemadminPayload (must have type
 *   'systemadmin')
 * @param props.jobSkillId - Unique identifier (UUID) of the job skill to be
 *   deleted
 * @returns Void
 * @throws {Error} If the job skill is not found, already deleted, or is
 *   referenced by applications
 */
export async function deleteatsRecruitmentSystemAdminJobSkillsJobSkillId(props: {
  systemAdmin: SystemadminPayload;
  jobSkillId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate the skill exists and is not soft-deleted (deleted_at must be null)
  const skill = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: {
      id: props.jobSkillId,
      deleted_at: null,
    },
  });
  if (!skill) {
    throw new Error("Job skill not found or already deleted");
  }

  // 2. Check referential integrity: Ensure no applications reference this skill
  const usedCount =
    await MyGlobal.prisma.ats_recruitment_application_skill_matches.count({
      where: {
        skill_id: props.jobSkillId,
      },
    });
  if (usedCount > 0) {
    throw new Error(
      "Cannot delete skill: still referenced in one or more applications",
    );
  }

  // 3. Perform hard delete (permanently remove the record)
  await MyGlobal.prisma.ats_recruitment_job_skills.delete({
    where: {
      id: props.jobSkillId,
    },
  });
}
