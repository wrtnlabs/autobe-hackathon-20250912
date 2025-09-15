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
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the end-to-end workflow for a system administrator to create and
 * assign a coding test to a job applicant.
 *
 * Business scenario:
 *
 * 1. Register an HR recruiter who will later be assigned as the creator of a job
 *    posting and assigner of a coding test.
 * 2. Register and authenticate a system administrator who creates employment types
 *    and job posting states.
 * 3. System admin creates job employment type and job posting state.
 * 4. System admin creates a job posting associated to the HR recruiter (created in
 *    step 1).
 * 5. Register an applicant who will apply to the posted job.
 * 6. Applicant uploads a resume.
 * 7. Applicant applies to the job posting (system returns application ID).
 * 8. System admin (re-authenticated if necessary) creates a coding test for the
 *    applicant & application, referencing correct applicant, application, and
 *    HR recruiter IDs.
 * 9. Coding test creation is validated for correct linkage and response type.
 * 10. Failure (negative) scenarios: verify coding test cannot be created with
 *     missing/invalid authentication or by non-privileged users (not
 *     implemented here; see negative-path tests).
 */
export async function test_api_admin_coding_test_creation_e2e_flow(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: "RecruiterPwd1234",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Register and authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPwd1234",
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 3. Create job employment type as admin
  const jobEmpType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmpType);

  // 4. Create job posting state as admin
  const postingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: `open_${RandomGenerator.alphaNumeric(5)}`,
          label: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 5. Create job posting under the HR recruiter and employment type, posting state
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: jobEmpType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 50000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "ApplicantPwd5678",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 7. Applicant uploads a resume
  const resume: IAtsRecruitmentResume =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: applicant.name,
        parsed_email: applicant.email,
        parsed_mobile: applicant.phone,
      } satisfies IAtsRecruitmentResume.ICreate,
    });
  typia.assert(resume);

  // 8. Applicant applies to the job posting
  const application: IAtsRecruitmentApplication =
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

  // 9. Re-authenticate system admin (if session/system requires role context switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPwd1234",
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 10. Create coding test for the applicant/application as system admin
  const scheduledAt = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2 days ahead
  const expirationAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 3 days ahead
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.systemAdmin.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          test_external_id: null,
          test_url: null,
          scheduled_at: scheduledAt,
          delivered_at: null,
          status: "scheduled",
          expiration_at: expirationAt,
          callback_received_at: null,
          closed_at: null,
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);
  TestValidator.equals(
    "coding test is linked to application, applicant, and hr recruiter correctly",
    codingTest.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "coding test applicant matches",
    codingTest.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "coding test HR recruiter matches",
    codingTest.ats_recruitment_hrrecruiter_id,
    hrRecruiter.id,
  );
  TestValidator.equals(
    "coding test provider is 'internal'",
    codingTest.test_provider,
    "internal",
  );
  TestValidator.equals(
    "coding test status is 'scheduled'",
    codingTest.status,
    "scheduled",
  );
}
