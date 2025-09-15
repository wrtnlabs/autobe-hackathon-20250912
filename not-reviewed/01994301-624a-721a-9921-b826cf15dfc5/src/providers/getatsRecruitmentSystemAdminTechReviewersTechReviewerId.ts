import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get full detail of a single technical reviewer from
 * ats_recruitment_techreviewers by ID.
 *
 * This operation retrieves the full detail of a specific technical reviewer
 * account using its unique identifier. It targets the
 * ats_recruitment_techreviewers table and returns all fields required for
 * profile and privilege auditing in the recruitment system.
 *
 * Designed for detailed review and verification, this endpoint enables system
 * administrators to fetch all information about a given tech reviewer—including
 * identifiers, name, email, specialization, status, and audit timestamps. It
 * queries the ats_recruitment_techreviewers entity by unique reviewer ID, and
 * serves for administrative audit, support, or compliance purposes.
 *
 * Access is strictly controlled: only systemAdmin users may acquire full
 * account details of a technical reviewer, given the sensitive nature of the
 * personnel involved in technical recruitment assessments. Usage may include
 * security checks, privilege management, or remediation workflows.
 *
 * Associated error responses include not-found for missing reviewerId or
 * permission errors if invoked by unauthorized actors. The output is suitable
 * for detailed enterprise UI display or for audit logging functions.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - Authenticated system admin user (authorization
 *   enforced)
 * @param props.techReviewerId - The unique identifier of the technical reviewer
 *   to retrieve
 * @returns IAtsRecruitmentTechReviewer with all profile and audit fields; never
 *   includes sensitive credential fields
 * @throws {Error} If reviewer is not found (404) or soft-deleted, or if called
 *   by non-admin
 */
export async function getatsRecruitmentSystemAdminTechReviewersTechReviewerId(props: {
  systemAdmin: SystemadminPayload;
  techReviewerId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentTechReviewer> {
  const { techReviewerId } = props;
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirstOrThrow({
      where: {
        id: techReviewerId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        specialization: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: reviewer.id,
    email: reviewer.email,
    name: reviewer.name,
    specialization: reviewer.specialization ?? null,
    is_active: reviewer.is_active,
    created_at: toISOStringSafe(reviewer.created_at),
    updated_at: toISOStringSafe(reviewer.updated_at),
    deleted_at: reviewer.deleted_at
      ? toISOStringSafe(reviewer.deleted_at)
      : null,
  };
}
