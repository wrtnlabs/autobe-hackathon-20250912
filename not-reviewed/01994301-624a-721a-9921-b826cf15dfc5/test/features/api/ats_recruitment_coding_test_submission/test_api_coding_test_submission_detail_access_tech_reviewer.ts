import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

// types already imported by template

/**
 * Validates that a technical reviewer, after proper authentication, can access
 * the complete detail information for a specific coding test submission.
 *
 * Workflow:
 *
 * 1. HR recruiter account is created and logged in.
 * 2. Applicant account is created and logged in.
 * 3. Technical reviewer account is created and logged in.
 * 4. HR recruiter assigns a coding test to the applicant.
 * 5. Applicant submits a solution for the coding test.
 * 6. Technical reviewer retrieves the submission detail using the GET endpoint.
 * 7. Test asserts that the submission detail matches the expected fields, data
 *    completeness, and type safety.
 * 8. Verifies error logic: unrelated reviewer is forbidden, not-found for wrong
 *    IDs, and forbidden access for applicant role.
 */
export async function test_api_coding_test_submission_detail_access_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Arrange actors and authentication
  // HR recruiter registration & login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(hr);

  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // Applicant registration & login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);

  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // Tech reviewer registration & login
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const reviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(reviewer);

  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    },
  });

  // HR recruiter switches context to create coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // Generate random UUID for application
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  // Create coding test assigned to applicant
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          test_provider: "internal",
          test_external_id: null,
          test_url: null,
          scheduled_at: new Date(Date.now() + 10000).toISOString(),
          delivered_at: null,
          status: "scheduled",
          expiration_at: null,
          callback_received_at: null,
          closed_at: null,
        },
      },
    );
  typia.assert(codingTest);

  // Applicant switches context, submit coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const codingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: applicationId,
          submitted_at: new Date().toISOString(),
          answer_file_url: null,
          answer_text: RandomGenerator.paragraph({ sentences: 10 }),
          status: "pending",
          received_external_at: null,
          review_status: "pending",
          reviewed_at: null,
          review_comment_summary: null,
        },
      },
    );
  typia.assert(codingTestSubmission);

  // Tech reviewer switches back context
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    },
  });

  // === Happy path: tech reviewer retrieves the submission ===
  const got =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: codingTestSubmission.id,
      },
    );
  typia.assert(got);
  TestValidator.equals(
    "submission id matches",
    got.id,
    codingTestSubmission.id,
  );
  TestValidator.equals(
    "codingTestId matches",
    got.ats_recruitment_coding_test_id,
    codingTest.id,
  );
  TestValidator.equals(
    "application id matches",
    got.ats_recruitment_application_id,
    applicationId,
  );
  TestValidator.equals(
    "status matches",
    got.status,
    codingTestSubmission.status,
  );
  TestValidator.equals(
    "review status matches",
    got.review_status,
    codingTestSubmission.review_status,
  );

  // === Forbidden: wrong reviewer tries to fetch ===
  const reviewer2Email = typia.random<string & tags.Format<"email">>();
  const reviewer2Password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewer2Email,
      password: reviewer2Password,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewer2Email,
      password: reviewer2Password,
    },
  });
  await TestValidator.error(
    "Unrelated reviewer forbidden from accessing submission",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: codingTestSubmission.id,
        },
      );
    },
  );

  // === Not Found: invalid submissionId ===
  await TestValidator.error(
    "Not found error for random submission id",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // === Not Found: invalid codingTestId ===
  await TestValidator.error(
    "Not found error for random coding test id",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.at(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          submissionId: codingTestSubmission.id,
        },
      );
    },
  );

  // === Forbidden: access with applicant (not reviewer) ===
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error(
    "Applicant forbidden from accessing reviewer endpoint",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: codingTestSubmission.id,
        },
      );
    },
  );
}
