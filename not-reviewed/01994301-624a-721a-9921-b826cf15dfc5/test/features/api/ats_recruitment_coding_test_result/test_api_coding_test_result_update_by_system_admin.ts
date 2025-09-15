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
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates system admin functionality for updating coding test results and
 * confirms permissions, audit, and role-restriction business logic across all
 * involved actors.
 *
 * Business context: This test simulates a real applicant and HR flow through
 * registration, job posting, application, assignment of a coding test,
 * submission of an answer, initial scoring by a system admin, result update,
 * and an attempted unauthorized result mutation by a non-admin. It is meant to
 * verify:
 *
 * 1. Only system admins can update coding test results.
 * 2. Successful update by admin properly changes result fields.
 * 3. Applicants cannot update their own results (access control enforced).
 * 4. Result changes are reflected after update and old vs. new are
 *    distinguishable.
 *
 * Step-by-step process:
 *
 * 1. Register HR recruiter, applicant, and a system admin. Login as needed for
 *    proper role.
 * 2. HR creates required job posting state, employment type, and then a job
 *    posting.
 * 3. Applicant uploads resume, applies to the job posting.
 * 4. HR assigns a coding test to the applicant/application.
 * 5. Applicant submits a coding test answer.
 * 6. System admin posts the initial result for this submission.
 * 7. System admin performs an update on the result and confirms all changed fields
 *    are updated correctly.
 * 8. Switch to applicant and attempt to update the result (expect
 *    error/forbidden).
 * 9. Confirm correct business rule/ACL enforcement for result mutation and
 *    permission boundaries.
 */
export async function test_api_coding_test_result_update_by_system_admin(
  connection: api.IConnection,
) {
  // Register HR recruiter and login (capture credentials for session switching)
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterPassword = "SamplePassword1";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(hrRecruiter);

  // Register applicant and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "SamplePassword2";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);

  // Register system admin and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SamplePassword3";
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: false,
    },
  });
  typia.assert(systemAdmin);

  // Login as HR recruiter to set up job entities
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    },
  });

  // Create job employment type
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(employmentType);

  // Create job posting state
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(postingState);

  // Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 3000,
          salary_range_max: 10000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // Applicant logs in to upload resume & apply
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: applicantEmail,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: null,
        parsed_education_summary: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_experience_summary: RandomGenerator.paragraph({ sentences: 2 }),
        skills_json: JSON.stringify([
          RandomGenerator.paragraph({ sentences: 1 }),
        ]),
      },
    },
  );
  typia.assert(resume);

  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume.id,
        },
      },
    );
  typia.assert(application);

  // HR assigns coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    },
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
          test_external_id: null,
          test_url: null,
          scheduled_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          delivered_at: null,
          status: "scheduled",
          expiration_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          callback_received_at: null,
          closed_at: null,
        },
      },
    );
  typia.assert(codingTest);

  // Applicant submits coding answer
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: application.id,
          submitted_at: new Date().toISOString(),
          answer_file_url: null,
          answer_text: "function solution() { return true; }",
          status: "pending",
          received_external_at: null,
          review_status: "pending",
          reviewed_at: null,
          review_comment_summary: null,
        },
      },
    );
  typia.assert(submission);

  // System admin posts initial result
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const initialResult =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {
          ats_recruitment_coding_test_submission_id: submission.id,
          ats_recruitment_coding_test_id: codingTest.id,
          evaluation_method: "manual",
          score: 80,
          maximum_score: 100,
          plagiarism_flag: false,
          ranking_percentile: 90,
          result_json: JSON.stringify({ passed: true }),
          finalized_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(initialResult);

  // System admin update
  const updatedResult =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.update(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: initialResult.id,
        body: {
          evaluation_method: "admin_override",
          score: 95,
          maximum_score: 100,
          plagiarism_flag: false,
          ranking_percentile: 95,
          result_json: JSON.stringify({
            passed: true,
            remarks: "Adjusted by admin",
          }),
          finalized_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(updatedResult);
  TestValidator.notEquals(
    "Result should change after admin update",
    updatedResult,
    initialResult,
  );
  TestValidator.equals("Score is updated to 95", updatedResult.score, 95);
  TestValidator.equals(
    "Evaluation method is updated to 'admin_override'",
    updatedResult.evaluation_method,
    "admin_override",
  );
  TestValidator.predicate(
    "Ranking percentile should be greater or equal to previous",
    updatedResult.ranking_percentile >= initialResult.ranking_percentile,
  );

  // Switch to applicant, test forbidden update
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error(
    "Non-admin cannot update coding test result",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.update(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: initialResult.id,
          body: {
            evaluation_method: "manual",
            score: 10,
          },
        },
      );
    },
  );
}
