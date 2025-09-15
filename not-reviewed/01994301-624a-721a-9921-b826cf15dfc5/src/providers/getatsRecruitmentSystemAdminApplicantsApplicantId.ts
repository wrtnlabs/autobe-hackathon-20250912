import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single applicant profile by applicantId.
 *
 * This function fetches the full detailed profile for a specific applicant,
 * including all profile and contact fields, from the ats_recruitment_applicants
 * table. Access is provided only to system administrators. Returns all core
 * applicant fields such as name, email, phone, status, and audit timestamps.
 * Throws an error if the applicant does not exist or has been soft-deleted.
 *
 * @param props - Parameters including systemAdmin authentication and the target
 *   applicantId.
 * @param props.systemAdmin - The authenticated SystemadminPayload making the
 *   request.
 * @param props.applicantId - UUID of the applicant to fetch.
 * @returns The applicant's full profile according to business DTO
 *   (IAtsRecruitmentApplicant).
 * @throws {Error} If the applicant does not exist or is soft-deleted.
 */
export async function getatsRecruitmentSystemAdminApplicantsApplicantId(props: {
  systemAdmin: SystemadminPayload;
  applicantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicant> {
  const { applicantId } = props;

  const record = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: applicantId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!record) throw new Error("Applicant not found or deleted");

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    phone: record.phone === null ? undefined : record.phone,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
