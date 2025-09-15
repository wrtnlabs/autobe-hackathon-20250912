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
 * Validate the evaluation of a coding test result by a system admin.
 *
 * This scenario checks full process, from applicant/career/job/test resource
 * creation, up to submission and system admin result registration and business
 * constraint enforcement. Ensures the system admin can override or submit
 * coding test results, one per submission, with audit trace.
 *
 * Steps:
 *
 * 1. Register HR recruiter
 * 2. Register applicant
 * 3. Register system admin
 * 4. HR login & create employment type
 * 5. HR create posting state
 * 6. HR create job posting referencing above types
 * 7. Applicant login & upload resume
 * 8. Applicant apply for job, referencing resume
 * 9. HR login & assign coding test to application
 * 10. Applicant login & submit coding test
 * 11. System admin login & submit result (admin_override)
 * 12. Assert result saved and fields/audit are correct, only one result per
 *     submission (duplicate test error), and references must exist
 */
export async function test_api_coding_test_result_evaluation_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "Password1234!";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Step 2: Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "TestPass1234!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // Step 3: Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234!";
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: HR login & create employment type
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // Step 5: HR create posting state
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // Step 6: HR create job posting referencing above types
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 60000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 3600 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // Step 7: Applicant login & upload resume
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: typia.random<string & tags.Format<"email">>(),
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: null,
        parsed_education_summary: RandomGenerator.paragraph({ sentences: 1 }),
        parsed_experience_summary: RandomGenerator.paragraph({ sentences: 1 }),
        skills_json: JSON.stringify(["typescript", "node.js", "sql"]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // Step 8: Applicant apply for job, referencing resume
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

  // Step 9: HR login & assign coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
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
          scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          delivered_at: null,
          status: "scheduled",
          expiration_at: new Date(
            Date.now() + 3 * 24 * 3600 * 1000,
          ).toISOString(),
          callback_received_at: null,
          closed_at: null,
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // Step 10: Applicant login & submit coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
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
          answer_text: RandomGenerator.content({ paragraphs: 1 }),
          status: "pending",
          received_external_at: null,
          review_status: "pending",
          reviewed_at: null,
          review_comment_summary: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(submission);

  // Step 11: System admin login & submit coding test result (admin_override)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  const resultBody = {
    ats_recruitment_coding_test_submission_id: submission.id,
    ats_recruitment_coding_test_id: codingTest.id,
    evaluation_method: "admin_override",
    score: 92,
    maximum_score: 100,
    plagiarism_flag: false,
    ranking_percentile: 95,
    result_json: JSON.stringify({ pass: true, execution_time: 1.24 }),
    finalized_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentCodingTestResult.ICreate;

  const result =
    await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: resultBody,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "system admin result attached",
    result.ats_recruitment_coding_test_submission_id,
    submission.id,
  );
  TestValidator.equals(
    "result evaluation method is admin_override",
    result.evaluation_method,
    "admin_override",
  );
  TestValidator.equals("result score", result.score, 92);
  TestValidator.predicate(
    "score does not exceed maximum_score",
    result.score <= result.maximum_score,
  );
  TestValidator.equals(
    "result plagiarism flag is false",
    result.plagiarism_flag,
    false,
  );
  TestValidator.equals(
    "audit finalized_at set",
    typeof result.finalized_at,
    "string",
  );

  // Step 12: Test duplicate admin result for same submission fails (business logic error)
  await TestValidator.error(
    "duplicate admin result for submission should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.submissions.results.create(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          body: resultBody,
        },
      );
    },
  );
}
