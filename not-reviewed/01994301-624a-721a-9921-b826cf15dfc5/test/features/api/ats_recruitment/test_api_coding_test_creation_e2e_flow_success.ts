import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_coding_test_creation_e2e_flow_success(
  connection: api.IConnection,
) {
  /**
   * E2E flow: HR recruiter creates a job posting, applicant applies, and HR
   * recruiter assigns a coding test.
   *
   * This test covers: registering HR recruiter and applicant, HR recruiter
   * creating a job employment type and job posting state, job posting creation,
   * applicant uploading a resume and applying, and finally the HR recruiter
   * assigning a coding test for the application. Each role switch is performed
   * via re-authentication. All critical record IDs are validated for
   * association and correctness, with all API responses asserted. The success
   * path is validated thoroughly.
   */
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrName = RandomGenerator.name();

  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: hrName,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();

  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: applicantName,
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. HR creates job employment type
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-Time" + RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph(),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 4. HR creates job posting state
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open" + RandomGenerator.alphaNumeric(3),
          label: "Open",
          description: RandomGenerator.paragraph(),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 5. HR creates job posting
  const jobPostingInput = {
    hr_recruiter_id: hrRecruiter.id,
    job_employment_type_id: employmentType.id,
    job_posting_state_id: postingState.id,
    title: "Developer " + RandomGenerator.alphaNumeric(4),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: jobPostingInput,
      },
    );
  typia.assert(jobPosting);
  TestValidator.equals(
    "job posting recruiter reference",
    jobPosting.hr_recruiter_id,
    hrRecruiter.id,
  );

  // 6. Applicant uploads resume
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
        title: "Resume " + RandomGenerator.alphaNumeric(6),
        parsed_name: applicantName,
        parsed_email: applicantEmail,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_education_summary: RandomGenerator.paragraph({ sentences: 5 }),
        parsed_experience_summary: RandomGenerator.paragraph({ sentences: 5 }),
        skills_json: JSON.stringify(["TypeScript", "Node.js", "Testing"]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);
  TestValidator.equals("resume applicant", resume.parsed_email, applicantEmail);

  // 7. Applicant applies to job posting
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
  TestValidator.equals(
    "application job posting",
    application.job_posting_id,
    jobPosting.id,
  );

  // 8. HR logs in again (simulate role switch)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 9. HR creates coding test
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 3600_000).toISOString(); // 1 hour later
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          test_external_id: RandomGenerator.alphaNumeric(10),
          scheduled_at: scheduledAt,
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);
  TestValidator.equals(
    "coding test application id",
    codingTest.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "coding test applicant id",
    codingTest.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "coding test hr id",
    codingTest.ats_recruitment_hrrecruiter_id,
    hrRecruiter.id,
  );
  TestValidator.equals(
    "coding test provider",
    codingTest.test_provider,
    "internal",
  );
  TestValidator.equals("coding test status", codingTest.status, "scheduled");
}
