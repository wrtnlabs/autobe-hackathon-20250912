import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system administrator can retrieve full details for any
 * coding test in the system for audit or compliance purposes.
 *
 * Steps:
 *
 * 1. Register and authenticate as system admin.
 * 2. Register and authenticate as HR recruiter and as applicant.
 * 3. HR recruiter creates a job posting with required fields.
 * 4. Applicant applies to the job posting.
 * 5. HR recruiter assigns a coding test to the applicant's application.
 * 6. Switch back to system admin role (if context changed).
 * 7. As system admin, retrieve coding test by ID and validate all output
 *    fields.
 * 8. Try accessing with a non-existent codingTestId, expect error.
 * 9. Try accessing as a logged-out (unauthenticated) user, expect error.
 */
export async function test_api_system_admin_coding_test_full_audit_view(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SuperSecurePassword123!";
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(systemAdmin);

  // 2. Register HR recruiter and applicant
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "HrPassword456!";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(hrRecruiter);

  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "ApplicantPwd789!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(applicant);

  // 3. HR recruiter login and create job posting
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
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 4. Applicant login and apply to job posting
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

  // 5. HR recruiter login and assign coding test
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
          scheduled_at: new Date().toISOString(),
          status: "scheduled",
        },
      },
    );
  typia.assert(codingTest);

  // 6. System admin login (role/context switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: { email: adminEmail, password: adminPassword },
  });

  // 7. System admin retrieves coding test by ID
  const codingTestFromAdmin =
    await api.functional.atsRecruitment.systemAdmin.codingTests.at(connection, {
      codingTestId: codingTest.id,
    });
  typia.assert(codingTestFromAdmin);
  TestValidator.equals(
    "coding test details match",
    codingTestFromAdmin.id,
    codingTest.id,
  );

  // 8. Try with a non-existent codingTestId (random uuid)
  await TestValidator.error("404 on non-existent coding test", async () => {
    await api.functional.atsRecruitment.systemAdmin.codingTests.at(connection, {
      codingTestId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 9. Try as unauthenticated user
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated (401/403) access denied",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.codingTests.at(
        unauthConn,
        {
          codingTestId: codingTest.id,
        },
      );
    },
  );
}
