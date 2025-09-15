import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Get the full details of a specific coding test instance by ID.
 *
 * Retrieves detailed information for a coding test record identified by
 * codingTestId from the ats_recruitment_coding_tests table. This function
 * ensures that the authenticated applicant may only retrieve tests assigned to
 * them, and is soft-deletion aware. It returns all metadata, association to
 * application/applicant/HR recruiter, provider/platform identifiers, status and
 * scheduling details, as well as candidate-facing URLs and timestamps.
 *
 * Role-based access is enforced: applicants can only access their own tests;
 * 404 is thrown if the test does not exist or is not assigned to this
 * applicant.
 *
 * @param props - Operation input
 * @param props.applicant - Authenticated applicant payload (authorization)
 * @param props.codingTestId - Target coding test UUID
 * @returns IAtsRecruitmentCodingTest object with all metadata fields, dates as
 *   string & tags.Format<'date-time'>, optional/nullable fields as
 *   undefined/null
 * @throws {Error} 404 when coding test not found or not assigned to applicant
 */
export async function getatsRecruitmentApplicantCodingTestsCodingTestId(props: {
  applicant: ApplicantPayload;
  codingTestId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentCodingTest> {
  const { applicant, codingTestId } = props;
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        ats_recruitment_applicant_id: applicant.id,
        deleted_at: null,
      },
    });
  if (!codingTest) {
    throw new Error("Coding test not found or access denied");
  }
  return {
    id: codingTest.id,
    ats_recruitment_application_id: codingTest.ats_recruitment_application_id,
    ats_recruitment_applicant_id: codingTest.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: codingTest.ats_recruitment_hrrecruiter_id,
    test_provider: codingTest.test_provider,
    test_external_id:
      codingTest.test_external_id === null ||
      codingTest.test_external_id === undefined
        ? undefined
        : codingTest.test_external_id,
    test_url:
      codingTest.test_url === null || codingTest.test_url === undefined
        ? undefined
        : codingTest.test_url,
    scheduled_at: toISOStringSafe(codingTest.scheduled_at),
    delivered_at: codingTest.delivered_at
      ? toISOStringSafe(codingTest.delivered_at)
      : undefined,
    status: codingTest.status,
    expiration_at: codingTest.expiration_at
      ? toISOStringSafe(codingTest.expiration_at)
      : undefined,
    callback_received_at: codingTest.callback_received_at
      ? toISOStringSafe(codingTest.callback_received_at)
      : undefined,
    closed_at: codingTest.closed_at
      ? toISOStringSafe(codingTest.closed_at)
      : undefined,
    created_at: toISOStringSafe(codingTest.created_at),
    updated_at: toISOStringSafe(codingTest.updated_at),
    deleted_at: codingTest.deleted_at
      ? toISOStringSafe(codingTest.deleted_at)
      : undefined,
  };
}
