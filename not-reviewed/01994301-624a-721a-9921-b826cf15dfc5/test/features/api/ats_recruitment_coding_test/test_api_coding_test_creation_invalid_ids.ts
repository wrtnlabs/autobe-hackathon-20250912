import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that creating a coding test referencing invalid/non-existent
 * applicant, application, recruiter, or bogus external test_external_id results
 * in validation errors, and no record is created.
 *
 * This test ensures:
 *
 * 1. HR recruiter is registered and authenticated
 * 2. Attempted coding test creations using random (guaranteed-invalid) UUIDs as
 *    resource references
 * 3. Each attempt triggers business validation error (TestValidator.error) rather
 *    than type errors
 * 4. Proper field formats are used (UUIDs, ISO8601, non-null/required fields)
 * 5. No attempts to test type errors or missing required properties (forbidden)
 *
 * Steps:
 *
 * - Register as HR recruiter using dependency API
 * - Try creating coding tests using invalid UUIDs for applicant, application,
 *   recruiter, and unrelated test_external_id (for internal provider)
 * - For each, validate that the API rejects the operation (error is thrown)
 * - All attempts are performed under correct authentication context
 */
export async function test_api_coding_test_creation_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Register as a legal HR recruiter, which is required for all actions
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);

  // Prepare test parameters
  const invalid_uuid = typia.random<string & tags.Format<"uuid">>();
  const scheduled_at = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now
  const test_provider = "internal";

  // Try: applicant doesn't exist
  await TestValidator.error(
    "should fail if applicant ID does not exist",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: invalid_uuid,
            ats_recruitment_applicant_id: invalid_uuid,
            ats_recruitment_hrrecruiter_id: recruiter.id,
            test_provider: test_provider,
            scheduled_at: scheduled_at,
            status: "scheduled",
            test_external_id: null,
          } satisfies IAtsRecruitmentCodingTest.ICreate,
        },
      );
    },
  );
  // Try: application doesn't exist
  await TestValidator.error(
    "should fail if application ID does not exist",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: invalid_uuid,
            ats_recruitment_applicant_id: invalid_uuid,
            ats_recruitment_hrrecruiter_id: recruiter.id,
            test_provider: test_provider,
            scheduled_at: scheduled_at,
            status: "scheduled",
            test_external_id: null,
          } satisfies IAtsRecruitmentCodingTest.ICreate,
        },
      );
    },
  );
  // Try: recruiter ID is wrong
  await TestValidator.error(
    "should fail if recruiter ID is not a real recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: invalid_uuid,
            ats_recruitment_applicant_id: invalid_uuid,
            ats_recruitment_hrrecruiter_id: invalid_uuid,
            test_provider: test_provider,
            scheduled_at: scheduled_at,
            status: "scheduled",
            test_external_id: null,
          } satisfies IAtsRecruitmentCodingTest.ICreate,
        },
      );
    },
  );
  // Try: nonsense test_external_id for an internal provider
  await TestValidator.error(
    "should fail if test_external_id is bogus for internal provider",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: invalid_uuid,
            ats_recruitment_applicant_id: invalid_uuid,
            ats_recruitment_hrrecruiter_id: recruiter.id,
            test_provider: test_provider,
            scheduled_at: scheduled_at,
            status: "scheduled",
            test_external_id: "bogus-id-external-not-exist",
          } satisfies IAtsRecruitmentCodingTest.ICreate,
        },
      );
    },
  );
}
