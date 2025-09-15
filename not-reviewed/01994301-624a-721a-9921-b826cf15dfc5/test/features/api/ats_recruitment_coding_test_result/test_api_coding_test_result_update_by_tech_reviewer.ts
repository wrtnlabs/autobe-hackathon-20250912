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
 * E2E: Only the authorized tech reviewer can update a coding test result, all
 * ownership and permission boundaries are enforced.
 */
export async function test_api_coding_test_result_update_by_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Register tech reviewer A
  const reviewerAEmail = typia.random<string & tags.Format<"email">>();
  const reviewerA: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerAEmail,
        password: "password1!",
        name: RandomGenerator.name(),
        specialization: "Backend",
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(reviewerA);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: "password2!",
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hr);

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "password3!",
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 4. Applicant uploads resume
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: "password3!",
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const resume: IAtsRecruitmentResume =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: {
        title: RandomGenerator.paragraph(),
        parsed_name: RandomGenerator.name(),
        parsed_email: applicantEmail,
      } satisfies IAtsRecruitmentResume.ICreate,
    });
  typia.assert(resume);

  // 5. HR recruiter creates job employment type, posting state, job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: "password2!",
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const employmentType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-Time",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  const postingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open",
          label: "Open",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  const posting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: null,
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(posting);

  // 6. Applicant creates an application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: "password3!",
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: posting.id,
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. HR recruiter assigns coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: "password2!",
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          test_provider: "internal",
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 8. Applicant submits coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: "password3!",
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const submission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: new Date().toISOString(),
          answer_text: RandomGenerator.paragraph({ sentences: 6 }),
          status: "pending",
          review_status: "pending",
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(submission);

  // 9. Reviewer A (authorized) creates initial coding test result
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerAEmail,
      password: "password1!",
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  const resultCreateBody = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_coding_test_id: codingTest.id,
    evaluation_method: "manual",
    score: 75,
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: 80,
    result_json: JSON.stringify({ marks: "initial result" }),
    finalized_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestResult.ICreate;
  const initialResult: IAtsRecruitmentCodingTestResult =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: resultCreateBody,
      },
    );
  typia.assert(initialResult);
  TestValidator.equals("created result score", initialResult.score, 75);

  // 10. Reviewer A updates the result
  const updateBody = {
    score: 85,
    maximum_score: 100,
    evaluation_method: "manual_updated",
    plagiarism_flag: true,
    ranking_percentile: 95,
    result_json: JSON.stringify({ marks: "amended result" }),
    finalized_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestResult.IUpdate;
  const updatedResult: IAtsRecruitmentCodingTestResult =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.update(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: initialResult.id,
        body: updateBody,
      },
    );
  typia.assert(updatedResult);
  TestValidator.equals("result updated score", updatedResult.score, 85);
  TestValidator.equals(
    "result updated evaluation_method",
    updatedResult.evaluation_method,
    "manual_updated",
  );
  TestValidator.equals(
    "result updated plagiarism_flag",
    updatedResult.plagiarism_flag,
    true,
  );

  // 11. Register/login as other reviewer B
  const reviewerBEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerBEmail,
      password: "password4!",
      name: RandomGenerator.name(),
      specialization: "FE",
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerBEmail,
      password: "password4!",
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // B attempts forbidden update
  await TestValidator.error(
    "other tech reviewer should not update result of another reviewer",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.update(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: initialResult.id,
          body: {
            score: 70,
            evaluation_method: "external",
            finalized_at: new Date().toISOString(),
          } satisfies IAtsRecruitmentCodingTestResult.IUpdate,
        },
      );
    },
  );
}
