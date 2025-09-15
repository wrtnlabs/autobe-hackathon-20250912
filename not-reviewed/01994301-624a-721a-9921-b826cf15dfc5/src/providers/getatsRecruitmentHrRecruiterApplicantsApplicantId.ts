import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a single applicant profile by applicantId.
 *
 * Retrieves detailed profile data for a single applicant from the
 * ats_recruitment_applicants table, including all required core fields: name,
 * email, phone, is_active and audit timestamps.
 *
 * Authorization: Only accessible to authenticated HR recruiters (payload type
 * enforced via decorator). Throws clear error if applicant not found or has
 * been soft-deleted. All DateTime values are provided as ISO 8601 strings using
 * toISOStringSafe.
 *
 * @param props - Object containing hrRecruiter authorization and applicantId
 *   path parameter
 * @param props.hrRecruiter - The verified HR recruiter (payload injected by
 *   decorator)
 * @param props.applicantId - UUID of the applicant to retrieve
 * @returns IAtsRecruitmentApplicant - The applicant's profile data fully
 *   populated
 * @throws {Error} When applicant does not exist or has been deleted
 */
export async function getatsRecruitmentHrRecruiterApplicantsApplicantId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicant> {
  const { applicantId } = props;
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: applicantId,
      deleted_at: null,
    },
  });
  if (!applicant) throw new Error("Applicant not found");
  return {
    id: applicant.id,
    email: applicant.email,
    name: applicant.name,
    phone: applicant.phone ?? undefined,
    is_active: applicant.is_active,
    created_at: toISOStringSafe(applicant.created_at),
    updated_at: toISOStringSafe(applicant.updated_at),
    deleted_at: applicant.deleted_at
      ? toISOStringSafe(applicant.deleted_at)
      : undefined,
  };
}
