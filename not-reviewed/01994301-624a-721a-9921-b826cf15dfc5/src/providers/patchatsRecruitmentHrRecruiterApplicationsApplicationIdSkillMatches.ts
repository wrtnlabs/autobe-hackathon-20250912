import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationSkillMatchesArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatchesArray";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get all skill match results for a given application
 * (AtsRecruitmentApplicationSkillMatches table).
 *
 * This endpoint allows authorized HR recruiters and technical reviewers to
 * access the full list of skill match results tied to a specific job
 * application. Each entry provides the skill, match type (e.g. required,
 * preferred), AI confidence score, and a manual verification flag. Used for
 * skill fit analysis and transparent evaluation.
 *
 * Only accessible to HR/recruiter and reviewer roles. Throws an error if the
 * application does not exist. Pagination/filtering is not available in this
 * MVP.
 *
 * @param props - HrRecruiter: The authenticated HR recruiter payload
 *   (authorization enforced upstream) applicationId: The job application UUID
 *   whose skill matches will be retrieved
 * @returns Array of skill match result entries ({ skill_id, match_type,
 *   ai_score, is_manually_verified }) for review and analysis
 * @throws {Error} If no application with provided applicationId exists
 */
export async function patchatsRecruitmentHrRecruiterApplicationsApplicationIdSkillMatches(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationSkillMatchesArray> {
  // Step 1: Check application existence
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: props.applicationId },
    });
  if (!application) {
    throw new Error("Application not found");
  }

  // Step 2: Query all skill matches for the application
  const rows =
    await MyGlobal.prisma.ats_recruitment_application_skill_matches.findMany({
      where: { application_id: props.applicationId },
      select: {
        skill_id: true,
        match_type: true,
        ai_score: true,
        is_manually_verified: true,
      },
    });

  // Step 3: Transform results, strictly match type, never use 'as' or type assertions
  // Use typia.assert to brand as IAtsRecruitmentApplicationSkillMatchesArray for extra safety (no as-casts)
  return typia.assert<IAtsRecruitmentApplicationSkillMatchesArray>(
    rows.map((row) => ({
      skill_id: row.skill_id,
      match_type: row.match_type,
      ai_score: row.ai_score ?? undefined,
      is_manually_verified: row.is_manually_verified,
    })),
  );
}
