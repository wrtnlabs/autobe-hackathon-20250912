import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create and assign a new coding test to an applicant as part of recruitment.
 *
 * This operation creates a new coding test instance, linking to application,
 * applicant, and HR recruiter. It ensures all business references exist and are
 * active, prevents duplicate coding tests for the same triplet, and records all
 * scheduling/provider/status details in a fully auditable record.
 *
 * @param props - Contains system admin payload (for authorization) and coding
 *   test creation details.
 * @param props.systemAdmin - The authenticated system admin creating the coding
 *   test.
 * @param props.body - Information about the coding test assignment including
 *   references and scheduling.
 * @returns Newly created IAtsRecruitmentCodingTest object with all relevant
 *   properties as API contract requires.
 * @throws {Error} If any referenced entity is missing, inactive, deleted, or if
 *   a duplicate coding test exists.
 */
export async function postatsRecruitmentSystemAdminCodingTests(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentCodingTest.ICreate;
}): Promise<IAtsRecruitmentCodingTest> {
  const { body } = props;
  // Check application reference exists and is not deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: body.ats_recruitment_application_id },
    });
  if (!application || application.deleted_at !== null) {
    throw new Error("Application not found or deleted");
  }
  // Check applicant reference exists and is active/not deleted
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findUnique(
    {
      where: { id: body.ats_recruitment_applicant_id },
    },
  );
  if (
    !applicant ||
    applicant.deleted_at !== null ||
    applicant.is_active !== true
  ) {
    throw new Error("Applicant not found, inactive, or deleted");
  }
  // Check HR recruiter reference exists and is active/not deleted
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findUnique({
      where: { id: body.ats_recruitment_hrrecruiter_id },
    });
  if (
    !recruiter ||
    recruiter.deleted_at !== null ||
    recruiter.is_active !== true
  ) {
    throw new Error("HR recruiter not found, inactive, or deleted");
  }
  // Check for a duplicate (same application/applicant/recruiter and undeleted)
  const duplicate =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        ats_recruitment_application_id: body.ats_recruitment_application_id,
        ats_recruitment_applicant_id: body.ats_recruitment_applicant_id,
        ats_recruitment_hrrecruiter_id: body.ats_recruitment_hrrecruiter_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "Coding test already exists for this application/applicant/recruiter",
    );
  }
  // Generate ID and timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.ats_recruitment_coding_tests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ats_recruitment_application_id: body.ats_recruitment_application_id,
      ats_recruitment_applicant_id: body.ats_recruitment_applicant_id,
      ats_recruitment_hrrecruiter_id: body.ats_recruitment_hrrecruiter_id,
      test_provider: body.test_provider,
      test_external_id: body.test_external_id ?? null,
      test_url: body.test_url ?? null,
      scheduled_at: body.scheduled_at,
      delivered_at: body.delivered_at ?? null,
      status: body.status,
      expiration_at: body.expiration_at ?? null,
      callback_received_at: body.callback_received_at ?? null,
      closed_at: body.closed_at ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Map all returned fields, converting Dates to ISO strings
  return {
    id: result.id,
    ats_recruitment_application_id: result.ats_recruitment_application_id,
    ats_recruitment_applicant_id: result.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: result.ats_recruitment_hrrecruiter_id,
    test_provider: result.test_provider,
    test_external_id: result.test_external_id ?? undefined,
    test_url: result.test_url ?? undefined,
    scheduled_at: toISOStringSafe(result.scheduled_at),
    delivered_at:
      result.delivered_at !== null && result.delivered_at !== undefined
        ? toISOStringSafe(result.delivered_at)
        : undefined,
    status: result.status,
    expiration_at:
      result.expiration_at !== null && result.expiration_at !== undefined
        ? toISOStringSafe(result.expiration_at)
        : undefined,
    callback_received_at:
      result.callback_received_at !== null &&
      result.callback_received_at !== undefined
        ? toISOStringSafe(result.callback_received_at)
        : undefined,
    closed_at:
      result.closed_at !== null && result.closed_at !== undefined
        ? toISOStringSafe(result.closed_at)
        : undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at !== null && result.deleted_at !== undefined
        ? toISOStringSafe(result.deleted_at)
        : undefined,
  };
}
