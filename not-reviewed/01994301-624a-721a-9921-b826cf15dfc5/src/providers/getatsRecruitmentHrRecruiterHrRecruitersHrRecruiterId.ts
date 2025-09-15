import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Fetch detailed HR recruiter account info by id
 * (ats_recruitment_hrrecruiters).
 *
 * Retrieves all profile data for a single HR recruiter identified by their
 * recruiter ID from the ats_recruitment_hrrecruiters table. It includes main
 * fields: email, name, department, account status, activity status, and related
 * metadata such as account creation and last updated timestamps.
 *
 * Only the HR recruiter themselves or system admin (if/when extended) may
 * access this endpoint. Credential and password hashes are never exposed.
 *
 * @param props - Object with the authenticated HR recruiter and requested
 *   recruiter ID
 * @param props.hrRecruiter - The authenticated HR recruiter payload
 * @param props.hrRecruiterId - The UUID of the HR recruiter whose profile is to
 *   be fetched
 * @returns IAtsRecruitmentHrRecruiter containing allowed profile fields (never
 *   credential info)
 * @throws {Error} If HR recruiter does not exist, is deleted, or access is
 *   forbidden
 */
export async function getatsRecruitmentHrRecruiterHrRecruitersHrRecruiterId(props: {
  hrRecruiter: HrrecruiterPayload;
  hrRecruiterId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentHrRecruiter> {
  // Authorization: only self (future may allow system admin, but not implemented here)
  if (props.hrRecruiter.id !== props.hrRecruiterId) {
    throw new Error(
      "Forbidden: You are not allowed to access another HR recruiter profile",
    );
  }

  // Only retrieve active, not deleted recruiter record by id
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: {
        id: props.hrRecruiterId,
        deleted_at: null,
      },
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

  if (!recruiter) {
    throw new Error("HR recruiter not found or is deleted");
  }

  return {
    id: recruiter.id,
    email: recruiter.email,
    name: recruiter.name,
    // department is optional+nullable: set if not undefined
    ...(recruiter.department !== undefined
      ? { department: recruiter.department }
      : {}),
    is_active: recruiter.is_active,
    created_at: toISOStringSafe(recruiter.created_at),
    updated_at: toISOStringSafe(recruiter.updated_at),
    // deleted_at is optional+nullable
    ...(recruiter.deleted_at !== undefined
      ? {
          deleted_at:
            recruiter.deleted_at === null
              ? null
              : toISOStringSafe(recruiter.deleted_at),
        }
      : {}),
  };
}
