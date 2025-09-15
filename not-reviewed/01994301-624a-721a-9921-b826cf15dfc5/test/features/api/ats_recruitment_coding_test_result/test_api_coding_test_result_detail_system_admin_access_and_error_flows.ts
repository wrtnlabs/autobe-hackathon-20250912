import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestResult";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates system administrator audit access to detailed coding test
 * result records, covering end-to-end workflow from role-based registration
 * to all business dependencies.
 *
 * Steps:
 *
 * 1. Register and authenticate as a system admin
 * 2. Register HR recruiter and applicant, and login with their accounts
 * 3. HR recruiter creates a job posting
 * 4. Applicant applies for the job
 * 5. HR recruiter assigns a coding test for the application
 * 6. Applicant submits their coding test solution
 * 7. Register and login as a tech reviewer, create a test result for
 *    submission
 * 8. System admin logs in again and fetches the result detail
 * 9. Validate data integrity and privilege (RBAC) for system admin
 * 10. Attempt to access with non-existent/invalid/deleted resultId and validate
 *     error
 * 11. Attempt to access as an unauthorized applicant and expect access-denied
 *     error
 */
export async function test_api_coding_test_result_detail_system_admin_access_and_error_flows(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminTest123!";
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register HR recruiter and login
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterPassword = "HrRecruiter123!";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 3. Register applicant and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "Applicant123!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 4. HR recruiter creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const jobPostingBody = {
    hr_recruiter_id: hrRecruiter.id,
    job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
    job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    salary_range_min: 1000,
    salary_range_max: 5000,
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 10,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: jobPostingBody,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant applies for the job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 6. HR recruiter assigns coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTestBody = {
    ats_recruitment_application_id: application.id,
    ats_recruitment_applicant_id: applicant.id,
    ats_recruitment_hrrecruiter_id: hrRecruiter.id,
    test_provider: "internal",
    test_external_id: null,
    test_url: null,
    scheduled_at: new Date().toISOString(),
    delivered_at: null,
    status: "scheduled",
    expiration_at: null,
    callback_received_at: null,
    closed_at: null,
  } satisfies IAtsRecruitmentCodingTest.ICreate;
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: codingTestBody,
      },
    );
  typia.assert(codingTest);

  // 7. Applicant submits coding test solution
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const nowString = new Date().toISOString();
  const submissionBody = {
    ats_recruitment_coding_test_id: codingTest.id,
    ats_recruitment_application_id: application.id,
    submitted_at: nowString,
    answer_file_url: null,
    answer_text: RandomGenerator.content({ paragraphs: 1 }),
    status: "pending",
    received_external_at: null,
    review_status: "pending",
    reviewed_at: null,
    review_comment_summary: null,
  } satisfies IAtsRecruitmentCodingTestSubmission.ICreate;
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: submissionBody,
      },
    );
  typia.assert(submission);

  // 8. Tech reviewer registers and logs in, creates coding test result
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = "TechReviewer123!";
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
      name: RandomGenerator.name(),
      specialization: null,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  const resultBody = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_coding_test_id: codingTest.id,
    evaluation_method: "manual",
    score: 95,
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: 80,
    result_json: JSON.stringify({ check: "ok" }),
    finalized_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestResult.ICreate;
  const result =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: resultBody,
      },
    );
  typia.assert(result);

  // 9. System admin logs in and fetches the coding test result
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const resultFetched =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: result.id,
      },
    );
  typia.assert(resultFetched);
  TestValidator.equals("result IDs match", resultFetched.id, result.id);
  TestValidator.equals(
    "coding test IDs match",
    resultFetched.ats_recruitment_coding_test_id,
    codingTest.id,
  );
  TestValidator.equals(
    "submission IDs match",
    resultFetched.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
  TestValidator.equals(
    "score is correct",
    resultFetched.score,
    resultBody.score,
  );
  TestValidator.equals(
    "maximum_score is correct",
    resultFetched.maximum_score,
    resultBody.maximum_score,
  );
  TestValidator.equals(
    "plagiarism_flag is correct",
    resultFetched.plagiarism_flag,
    resultBody.plagiarism_flag,
  );
  TestValidator.equals(
    "ranking_percentile is correct",
    resultFetched.ranking_percentile,
    resultBody.ranking_percentile,
  );
  TestValidator.equals(
    "result_json is correct",
    resultFetched.result_json,
    resultBody.result_json,
  );
  TestValidator.equals(
    "evaluation_method is correct",
    resultFetched.evaluation_method,
    resultBody.evaluation_method,
  );

  // 10. Error: Attempt to fetch non-existent resultId
  await TestValidator.error(
    "system admin - error if resultId is not found",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 11. Error: Invalid resultId format
  await TestValidator.error(
    "system admin - error if resultId is invalid uuid",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: "invalid-uuid" as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 12. Error: Unauthorized applicant attempts to fetch result
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "unauthorized (applicant) cannot access coding test result detail as system admin",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: result.id,
        },
      );
    },
  );
}
