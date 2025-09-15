import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create and assign a new coding test to an applicant as part of recruitment.
 *
 * This endpoint creates a new coding test assignment in the
 * ats_recruitment_coding_tests table, linking it to the specified job
 * application, applicant, and HR recruiter. All input references are validated
 * for existence and status (active, non-deleted) per business rules. No
 * duplicate coding test for the same application and applicant is allowed.
 * Foreign key relations are verified, and authorization requires that the
 * authenticated HR recruiter matches the recruiter referenced by
 * ats_recruitment_hrrecruiter_id.
 *
 * All datetime fields must be handled as string & tags.Format<'date-time'>; at
 * no point is the native Date type used. All values are returned fully branded
 * for type safety and API contract compliance.
 *
 * @param props - Contains the authenticated HR recruiter and request body for
 *   coding test creation
 * @param props.hrRecruiter - The authenticated HR recruiter
 *   (HrrecruiterPayload)
 * @param props.body - The IAtsRecruitmentCodingTest.ICreate request body
 * @returns The complete IAtsRecruitmentCodingTest record created (with all
 *   relationships and fields populated)
 * @throws {Error} 403 if the recruiter does not match or is unauthorized
 * @throws {Error} 404 if any referenced FK (applicant, application, recruiter)
 *   does not exist or is not active
 * @throws {Error} 400 if any business validation fails (duplicate coding test,
 *   etc)
 */
export async function postatsRecruitmentHrRecruiterCodingTests(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentCodingTest.ICreate;
}): Promise<IAtsRecruitmentCodingTest> {
  // Authorization: only allowed if authenticated recruiter matches referenced recruiter
  if (props.hrRecruiter.id !== props.body.ats_recruitment_hrrecruiter_id) {
    throw new Error("Forbidden: recruiter does not match");
  }

  // Validate Applicant exists and is active
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: props.body.ats_recruitment_applicant_id,
      deleted_at: null,
      is_active: true,
    },
  });
  if (!applicant) throw new Error("Applicant not found or not active");

  // Validate Application exists and is not deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: props.body.ats_recruitment_application_id,
        deleted_at: null,
      },
    });
  if (!application) throw new Error("Application not found or deleted");

  // Validate HR recruiter exists and is active
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: {
        id: props.body.ats_recruitment_hrrecruiter_id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!recruiter) throw new Error("HR recruiter not found or not active");

  // Ensure no duplicate test for (application + applicant)
  const existing = await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst(
    {
      where: {
        ats_recruitment_application_id:
          props.body.ats_recruitment_application_id,
        ats_recruitment_applicant_id: props.body.ats_recruitment_applicant_id,
      },
    },
  );
  if (existing)
    throw new Error("Duplicate coding test for this applicant/application");

  // Generate IDs and timestamps as branded types
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Prepare insert data with all nullable fields set explicitly; omit undefined
  const created = await MyGlobal.prisma.ats_recruitment_coding_tests.create({
    data: {
      id,
      ats_recruitment_application_id: props.body.ats_recruitment_application_id,
      ats_recruitment_applicant_id: props.body.ats_recruitment_applicant_id,
      ats_recruitment_hrrecruiter_id: props.body.ats_recruitment_hrrecruiter_id,
      test_provider: props.body.test_provider,
      test_external_id:
        "test_external_id" in props.body &&
        props.body.test_external_id !== undefined
          ? props.body.test_external_id
          : null,
      test_url:
        "test_url" in props.body && props.body.test_url !== undefined
          ? props.body.test_url
          : null,
      scheduled_at: props.body.scheduled_at,
      delivered_at:
        "delivered_at" in props.body && props.body.delivered_at !== undefined
          ? props.body.delivered_at
          : null,
      status: props.body.status,
      expiration_at:
        "expiration_at" in props.body && props.body.expiration_at !== undefined
          ? props.body.expiration_at
          : null,
      callback_received_at:
        "callback_received_at" in props.body &&
        props.body.callback_received_at !== undefined
          ? props.body.callback_received_at
          : null,
      closed_at:
        "closed_at" in props.body && props.body.closed_at !== undefined
          ? props.body.closed_at
          : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return response conforming to IAtsRecruitmentCodingTest, branding all date/datetime fields and handling nullables properly
  return {
    id: created.id,
    ats_recruitment_application_id: created.ats_recruitment_application_id,
    ats_recruitment_applicant_id: created.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: created.ats_recruitment_hrrecruiter_id,
    test_provider: created.test_provider,
    test_external_id: created.test_external_id ?? null,
    test_url: created.test_url ?? null,
    scheduled_at: toISOStringSafe(created.scheduled_at),
    delivered_at:
      created.delivered_at === null || created.delivered_at === undefined
        ? null
        : toISOStringSafe(created.delivered_at),
    status: created.status,
    expiration_at:
      created.expiration_at === null || created.expiration_at === undefined
        ? null
        : toISOStringSafe(created.expiration_at),
    callback_received_at:
      created.callback_received_at === null ||
      created.callback_received_at === undefined
        ? null
        : toISOStringSafe(created.callback_received_at),
    closed_at:
      created.closed_at === null || created.closed_at === undefined
        ? null
        : toISOStringSafe(created.closed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? null
        : toISOStringSafe(created.deleted_at),
  };
}
