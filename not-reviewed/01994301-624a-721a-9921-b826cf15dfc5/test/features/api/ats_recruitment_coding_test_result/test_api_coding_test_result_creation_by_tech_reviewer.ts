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
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the end-to-end workflow for a technical reviewer creating a coding
 * test result, covering full business journey and error edge cases.
 */
export async function test_api_coding_test_result_creation_by_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Register and login as HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrJoin);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 2. Create employment type & job posting state
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(7),
          label: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // 3. Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrJoin.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 50000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Register and login as applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Upload a resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 6. Apply to job posting
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. Login again as HR recruiter (switch context)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. Assign a coding test as HR recruiter
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicantJoin.id,
          ats_recruitment_hrrecruiter_id: hrJoin.id,
          test_provider: "internal",
          status: "scheduled",
          scheduled_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 9. Login as applicant (switch back)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 10. Submit the coding test submission
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: new Date().toISOString(),
          answer_text: RandomGenerator.paragraph(),
          status: "pending",
          review_status: "pending",
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(submission);

  // 11. Register and login as tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const reviewerJoin = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(reviewerJoin);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 12. Reviewer creates coding test result
  const resultBody = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_coding_test_id: codingTest.id,
    evaluation_method: RandomGenerator.pick([
      "manual",
      "auto",
      "external",
      "rerun",
      "admin_override",
    ] as const),
    score: 88.5,
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: 85,
    result_json: JSON.stringify({ detail: "Test result details here" }),
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
  TestValidator.equals(
    "coding test result - core id match",
    result.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
  TestValidator.equals(
    "coding test result - test id match",
    result.ats_recruitment_coding_test_id,
    codingTest.id,
  );
  TestValidator.equals(
    "coding test result - score match",
    result.score,
    resultBody.score,
  );

  // 13. Business rule: Only authorized tech reviewers can post result
  // Attempt as HR recruiter - must error
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "HR recruiter cannot create coding test result",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          body: resultBody,
        },
      );
    },
  );

  // Attempt as applicant - must error
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "Applicant cannot create coding test result",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          body: resultBody,
        },
      );
    },
  );

  // Back to reviewer
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 14. Only one result per submission per reviewer (duplicate should fail)
  await TestValidator.error("Duplicate result creation fails", async () => {
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: resultBody,
      },
    );
  });

  // 15. Submission must exist (error on bogus id)
  await TestValidator.error(
    "Nonexistent submission id fails (for result creation)",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: typia.random<string & tags.Format<"uuid">>(),
          body: resultBody,
        },
      );
    },
  );
}
