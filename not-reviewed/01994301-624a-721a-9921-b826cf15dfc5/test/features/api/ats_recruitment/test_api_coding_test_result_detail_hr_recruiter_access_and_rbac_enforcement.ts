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
 * Validate HR recruiter can get detail for coding test result of a job
 * applicant they directly manage (RBAC), and that unrelated/unauthenticated
 * users are denied.
 *
 * End-to-end workflow:
 *
 * 1. Register and login main HR recruiter (authorized for test)
 * 2. Register and login secondary HR recruiter (will test forbidden access)
 * 3. Register and login applicant
 * 4. Register tech reviewer
 * 5. Main HR creates job posting
 * 6. Applicant submits job application
 * 7. Main HR assigns coding test to applicant/application
 * 8. Applicant submits test submission
 * 9. Tech reviewer creates result on test submission
 * 10. Main HR recruiter requests GET on result -- expects full record
 * 11. Attempt GET as secondary recruiter -- expects forbidden
 * 12. Attempt GET as unauthenticated user -- expects unauthorized
 * 13. Attempt GET on non-existent resultId -- expects not found
 */
export async function test_api_coding_test_result_detail_hr_recruiter_access_and_rbac_enforcement(
  connection: api.IConnection,
) {
  // 1. HR recruiter 1 (main, authorized) registration
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPwd = RandomGenerator.alphaNumeric(12);
  const hrRecruiter1 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter1);

  // 2. HR recruiter 2 (secondary, unrelated) registration
  const hr2Email = typia.random<string & tags.Format<"email">>();
  const hr2Pwd = RandomGenerator.alphaNumeric(12);
  const hrRecruiter2 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hr2Email,
      password: hr2Pwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter2);

  // 3. Applicant registration
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPwd = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Tech reviewer registration
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPwd = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: techPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 5. HR recruiter 1 creates a job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const posting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter1.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(posting);

  // 6. Applicant applies to job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: posting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. HR recruiter assigns a coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter1.id,
          test_provider: RandomGenerator.pick(["internal", "external"]),
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 8. Applicant submits coding test submission
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
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
          answer_text: RandomGenerator.content({ paragraphs: 1 }),
          status: "pending",
          review_status: "pending",
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(submission);

  // 9. Tech reviewer creates coding test result
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techEmail,
      password: techPwd,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  const now = new Date();
  const result =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.results.create(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        body: {
          ats_recruitment_coding_test_submission_id: submission.id,
          ats_recruitment_coding_test_id: codingTest.id,
          evaluation_method: RandomGenerator.pick([
            "auto",
            "manual",
            "external",
          ]),
          score: 92.5,
          maximum_score: 100,
          plagiarism_flag: false,
          ranking_percentile: 95,
          result_json: JSON.stringify({ comment: "Excellent result" }),
          finalized_at: now.toISOString(),
        } satisfies IAtsRecruitmentCodingTestResult.ICreate,
      },
    );
  typia.assert(result);

  // 10. HR recruiter 1 requests coding test result detail (should succeed)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const resultDetail =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.results.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: result.id,
      },
    );
  typia.assert(resultDetail);
  TestValidator.equals("coding test result matches", resultDetail, result);

  // 11. HR recruiter 2 tries to retrieve coding test result (should get forbidden)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hr2Email,
      password: hr2Pwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "RBAC: unrelated HR recruiter forbidden",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.results.at(
        connection,
        {
          codingTestId: codingTest.id,
          submissionId: submission.id,
          resultId: result.id,
        },
      );
    },
  );

  // 12. Unauthenticated attempt (should get unauthorized)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.results.at(
      unauthConn,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: result.id,
      },
    );
  });

  // 13. HR recruiter 1 requests non-existent result (should get not found/error)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error("not found: non-existent result id", async () => {
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.results.at(
      connection,
      {
        codingTestId: codingTest.id,
        submissionId: submission.id,
        resultId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
