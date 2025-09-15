import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system administrator can delete a coding test result for
 * a submission.
 *
 * Business context: System administrators are privileged users in the ATS
 * platform who may, for compliance or error correction, need to remove
 * coding test results for an applicant's submission. This operation should
 * be restricted to authorized personnel only, strictly audit-logged, and
 * should properly handle soft/hard deletion semantics (matching the
 * schema's "deleted_at" nullable support). Deletion must be effective,
 * idempotent, and must enforce authorization strictly.
 *
 * Steps:
 *
 * 1. Create and join a system admin with unique email (super_admin: true).
 *    Save credentials.
 * 2. Login as system admin to ensure authentication context is established.
 * 3. Create and join an applicant user; store credentials for possible auth
 *    re-use in negative/permission tests.
 * 4. Login as applicant (captures applicant authentication context).
 * 5. Generate IDs for coding test and submission (typia.uuid), since there is
 *    no API for separate creation.
 * 6. Switch back to system admin authentication.
 * 7. Create a coding test result for the above codingTestId/submissionId via
 *    system admin API, verifying that the correct properties are persisted
 *    (i.e., not soft-deleted, correct values, etc.).
 * 8. Perform the DELETE operation as system admin to erase the coding test
 *    result. Ensure that after deletion, the result is not discoverable (if
 *    such API existed, we would check the absence or deleted_at field
 *    update).
 * 9. Attempt to delete again (double deletion) — ensure it is handled (should
 *    fail gracefully with error).
 * 10. Attempt to use an invalid/non-existent resultId for deletion and check
 *     for error.
 * 11. (Authorization/permission) Switch to applicant context and attempt
 *     deletion (should fail with forbidden/unauthorized error).
 * 12. Negative: Try the operation with unauthenticated connection (must fail).
 * 13. Compliance: (If logs API existed, would verify audit log presence for the
 *     deletion action.)
 */
export async function test_api_coding_test_result_deletion_by_system_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Create and join a system admin (super_admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 3. Create and join an applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10) + "A1";
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 4. Login as applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Prepare CodingTestId and SubmissionId
  const codingTestId = typia.random<string & tags.Format<"uuid">>();
  const submissionId = typia.random<string & tags.Format<"uuid">>();

  // 6. Switch back to system admin authentication
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 7. Create a coding test result
  const finalized_at = new Date().toISOString();
  const body = {
    ats_recruitment_coding_test_id: codingTestId,
    ats_recruitment_coding_test_submission_id: submissionId,
    evaluation_method: RandomGenerator.pick([
      "auto",
      "manual",
      "external",
      "rerun",
      "admin_override",
    ] as const),
    score: Math.floor(Math.random() * 101), // 0-100
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: Math.floor(Math.random() * 101),
    finalized_at,
    // Optionally add result_json (as stringified JSON or null)
  } satisfies IAtsRecruitmentCodingTestResult.ICreate;

  const result: IAtsRecruitmentCodingTestResult =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.create(
      connection,
      {
        codingTestId,
        submissionId,
        body,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "Result should be for correct codingTestId",
    result.ats_recruitment_coding_test_id,
    codingTestId,
  );
  TestValidator.equals(
    "Result should be for correct submission",
    result.ats_recruitment_coding_test_submission_id,
    submissionId,
  );
  TestValidator.equals(
    "Result must not be soft-deleted on creation",
    result.deleted_at,
    null,
  );

  // 8. DELETE operation as admin
  await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.erase(
    connection,
    {
      codingTestId,
      submissionId,
      resultId: result.id,
    },
  );
  // (No direct API to confirm deletion, but would check if discoverable/logged if such exists)

  // 9. Double deletion attempt (should fail)
  await TestValidator.error(
    "Double-deletion of coding test result should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.erase(
        connection,
        {
          codingTestId,
          submissionId,
          resultId: result.id,
        },
      );
    },
  );

  // 10. Attempt to delete a non-existent result
  const fakeResultId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent coding test result should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.erase(
        connection,
        {
          codingTestId,
          submissionId,
          resultId: fakeResultId,
        },
      );
    },
  );

  // 11. Permission: Switch to applicant and attempt delete (should fail)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "Applicant unauthorized to delete coding test result",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.erase(
        connection,
        {
          codingTestId,
          submissionId,
          resultId: result.id,
        },
      );
    },
  );

  // 12. Negative: Unauthenticated connection attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Delete with no authentication should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.erase(
        unauthConn,
        {
          codingTestId,
          submissionId,
          resultId: result.id,
        },
      );
    },
  );

  // 13. (If there were an audit log/verify, would check now)
}
