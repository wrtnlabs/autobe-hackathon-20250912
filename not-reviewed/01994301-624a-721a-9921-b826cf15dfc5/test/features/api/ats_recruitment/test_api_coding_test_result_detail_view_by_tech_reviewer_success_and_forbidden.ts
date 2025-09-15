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
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate technical reviewer result detail access (success + forbidden).
 *
 * 1. Register (join) two techReviewers: techReviewer1 (assigned),
 *    techReviewer2 (unrelated)
 * 2. Register applicant; HR recruiter joins
 * 3. HR recruiter creates job posting
 * 4. Applicant applies to job posting
 * 5. HR recruiter assigns a coding test for the application to the applicant
 * 6. Applicant submits the coding test
 * 7. TechReviewer1 (assigned) creates a coding test result for the submission
 * 8. TechReviewer1 (assigned) logs in and accesses their result detail:
 *    expects success
 * 9. TechReviewer2 (not assigned) logs in and attempts to access same result:
 *    expects forbidden/error
 * 10. Validate that returned coding test result has correct structure and ids
 */
export async function test_api_coding_test_result_detail_view_by_tech_reviewer_success_and_forbidden(
  connection: api.IConnection,
) {
  // 1. Register techReviewer1 (the assigned reviewer)
  const techReviewer1Email = typia.random<string & tags.Format<"email">>();
  const techReviewer1Password = RandomGenerator.alphaNumeric(12);
  const techReviewer1 = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: techReviewer1Email,
        password: techReviewer1Password,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(techReviewer1);

  // 2. Register techReviewer2 (not assigned, for forbidden test)
  const techReviewer2Email = typia.random<string & tags.Format<"email">>();
  const techReviewer2Password = RandomGenerator.alphaNumeric(12);
  const techReviewer2 = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: techReviewer2Email,
        password: techReviewer2Password,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(techReviewer2);

  // 3. Register applicant
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

  // 4. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(),
    },
  });
  typia.assert(hrRecruiter);

  // 5. HR recruiter creates a job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: { email: hrEmail, password: hrPassword },
  });
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 10,
          }),
          location: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 8,
          }),
          salary_range_min: 1000,
          salary_range_max: 3000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant logs in and applies for job posting
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        },
      },
    );
  typia.assert(application);

  // 7. HR recruiter logs back in and assigns a coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: { email: hrEmail, password: hrPassword },
  });
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          scheduled_at: new Date(
            Date.now() + 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "scheduled",
        },
      },
    );
  typia.assert(codingTest);

  // 8. Applicant logs in and submits the coding test
  await api.functional.auth.applicant.login(connection, {
    body: { email: applicantEmail, password: applicantPassword },
  });
  const testSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          answer_text: RandomGenerator.content({ paragraphs: 1 }),
          status: "pending",
          review_status: "pending",
        },
      },
    );
  typia.assert(testSubmission);

  // 9. TechReviewer1 logs in and creates a coding test result
  await api.functional.auth.techReviewer.login(connection, {
    body: { email: techReviewer1Email, password: techReviewer1Password },
  });
  const resultFinalizedAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const codingTestResult =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: testSubmission.id,
        body: {
          ats_recruitment_coding_test_submission_id: testSubmission.id,
          ats_recruitment_coding_test_id: codingTest.id,
          evaluation_method: "manual",
          score: 85,
          maximum_score: 100,
          plagiarism_flag: false,
          ranking_percentile: 90,
          result_json: JSON.stringify({ passed: true, details: "Well done!" }),
          finalized_at: resultFinalizedAt,
        },
      },
    );
  typia.assert(codingTestResult);

  // 10. TechReviewer1 accesses their result detail (success case)
  const resultDetail =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: testSubmission.id,
        resultId: codingTestResult.id,
      },
    );
  typia.assert(resultDetail);
  TestValidator.equals(
    "techReviewer assigned: correct coding test result returned",
    resultDetail,
    codingTestResult,
  );

  // 11. TechReviewer2 (unrelated) logs in and attempts to access the same result (should be forbidden/error)
  await api.functional.auth.techReviewer.login(connection, {
    body: { email: techReviewer2Email, password: techReviewer2Password },
  });
  await TestValidator.error(
    "techReviewer2 not assigned: forbidden to get coding test result detail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: testSubmission.id,
          resultId: codingTestResult.id,
        },
      );
    },
  );
}
