import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed HR recruiter account info by id
 * (ats_recruitment_hrrecruiters).
 *
 * Retrieves the full profile for a single HR recruiter by recruiter ID.
 * Excludes sensitive fields such as password hash. Returns core fields (id,
 * email, name, department, active status, creation/update/deletion timestamps).
 * Can only be accessed by system administrators.
 *
 * @param props - Function parameters
 * @param props.systemAdmin - Authenticated systemadmin making the request
 * @param props.hrRecruiterId - Unique HR recruiter account UUID
 * @returns The full IAtsRecruitmentHrRecruiter profile for the target HR
 *   recruiter
 * @throws {Error} If recruiter ID does not exist or is deleted
 */
export async function getatsRecruitmentSystemAdminHrRecruitersHrRecruiterId(props: {
  systemAdmin: SystemadminPayload;
  hrRecruiterId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentHrRecruiter> {
  const { hrRecruiterId } = props;
  const hrRecruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: { id: hrRecruiterId, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!hrRecruiter) throw new Error("HR recruiter not found");
  return {
    id: hrRecruiter.id,
    email: hrRecruiter.email,
    name: hrRecruiter.name,
    department: hrRecruiter.department ?? undefined,
    is_active: hrRecruiter.is_active,
    created_at: toISOStringSafe(hrRecruiter.created_at),
    updated_at: toISOStringSafe(hrRecruiter.updated_at),
    deleted_at:
      hrRecruiter.deleted_at !== null && hrRecruiter.deleted_at !== undefined
        ? toISOStringSafe(hrRecruiter.deleted_at)
        : undefined,
  };
}
