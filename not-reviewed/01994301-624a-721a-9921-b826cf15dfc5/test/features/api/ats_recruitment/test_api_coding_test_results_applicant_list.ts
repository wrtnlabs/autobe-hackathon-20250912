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
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTestResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestResult";

/**
 * Validates the applicant-facing view of coding test results within the ATS
 * process.
 *
 * This tests the full workflow:
 *
 * 1. Applicant, HR, and Tech Reviewer create & authenticate.
 * 2. Applicant applies for a job posting.
 * 3. HR assigns a coding test to the application.
 * 4. Applicant submits their test answers.
 * 5. Before review: applicant cannot see any results (list is empty).
 * 6. Tech reviewer logs in and writes a result for the applicant's submission.
 * 7. After review: applicant can query results for their submission—the
 *    result(s) are visible and accurate.
 * 8. Permission edge case: a different applicant cannot see others' results
 *    (should get empty or fail).
 * 9. Pagination/search edge cases: request with filter/sort/page params to
 *    validate business/format responses.
 */
export async function test_api_coding_test_results_applicant_list(
  connection: api.IConnection,
) {
  // 1. Create and login all actors
  // Applicant
  const applicantEmail: string = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "applicant12345";
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(applicant);

  // HR recruiter
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword = "hr12345pass";
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(hr);

  // Tech Reviewer
  const reviewerEmail: string = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = "reviewerpass987";
  const reviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(reviewer);

  // 2. Applicant logs in and applies for a job posting
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
        },
      },
    );
  typia.assert(application);

  // 3. HR logs in and assigns coding test for this application
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // in 1 hr
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          test_provider: "internal",
          scheduled_at: scheduledAt,
          status: "scheduled",
        },
      },
    );
  typia.assert(codingTest);

  // 4. Applicant logs in, submits their coding test
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const submitTime = new Date().toISOString();
  const submission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: submitTime,
          answer_text: RandomGenerator.paragraph({ sentences: 8 }),
          status: "pending",
          review_status: "pending",
        },
      },
    );
  typia.assert(submission);

  // 5. Before review: Applicant tries to view results (empty)
  let pageResult =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {}, // no filters
      },
    );
  typia.assert(pageResult);
  TestValidator.equals("no results before review", pageResult.data.length, 0);

  // 6. Tech reviewer logs in, writes a result
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    },
  });
  const score = Math.floor(Math.random() * 101); // 0-100
  const maximumScore = 100;
  const codingTestResult: IAtsRecruitmentCodingTestResult =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {
          ats_recruitment_coding_test_submission_id: submission.id,
          ats_recruitment_coding_test_id: codingTest.id,
          evaluation_method: "manual",
          score,
          maximum_score: maximumScore,
          plagiarism_flag: false,
          ranking_percentile: Math.floor(Math.random() * 101),
          finalized_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(codingTestResult);

  // 7. Applicant logs in and can now see results
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const afterReviewResult =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {},
      },
    );
  typia.assert(afterReviewResult);
  TestValidator.equals(
    "should see 1 result after review",
    afterReviewResult.data.length,
    1,
  );
  const returnedResult = afterReviewResult.data[0];
  typia.assert(returnedResult);
  TestValidator.equals(
    "scoring fields match",
    returnedResult.id,
    codingTestResult.id,
  );
  TestValidator.predicate(
    "score and max are correct",
    returnedResult.score === score &&
      returnedResult.maximum_score === maximumScore,
  );
  TestValidator.equals(
    "submission linkage matches",
    returnedResult.ats_recruitment_coding_test_submission_id,
    submission.id,
  );

  // 8. Edge: another applicant cannot view this result
  // Register a second applicant
  const applicant2Email: string = typia.random<string & tags.Format<"email">>();
  const applicant2Password = "app2password";
  const applicant2: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicant2Email,
        password: applicant2Password,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(applicant2);

  await api.functional.auth.applicant.login(connection, {
    body: { email: applicant2Email, password: applicant2Password },
  });
  const forbiddenResult =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {},
      },
    );
  typia.assert(forbiddenResult);
  TestValidator.equals(
    "other applicant cannot view another's results",
    forbiddenResult.data.length,
    0,
  );

  // 9. Pagination/filter tests
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  // Filtering for non-existent method
  const filterNone =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: { evaluation_method: "auto" },
      },
    );
  typia.assert(filterNone);
  TestValidator.equals(
    "filtering result by eval method (none exist)",
    filterNone.data.length,
    0,
  );
  // Filtering for our existing result
  const filterMatch =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: { evaluation_method: "manual" },
      },
    );
  typia.assert(filterMatch);
  TestValidator.equals("filter finds the result", filterMatch.data.length, 1);
  // Pagination: page_size 1 (should be 1 result only)
  const paged =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.results.index(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: { page_size: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination returns only 1 result",
    paged.data.length,
    1,
  );
}
