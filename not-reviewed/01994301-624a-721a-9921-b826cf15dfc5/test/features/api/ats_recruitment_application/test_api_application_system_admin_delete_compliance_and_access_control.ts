import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate system administrator can delete job applications, and
 * access/error policies after deletion.
 *
 * Business context: Only system administrator may delete job applications.
 * Deleted applications should be inaccessible for further operations, and
 * all related audit/compliance side effects should be validated by
 * follow-up logic. Deleting with invalid applicationId or insufficient
 * privileges must fail.
 *
 * Steps:
 *
 * 1. Register a new system admin and log in (record admin credentials)
 * 2. Register a new applicant and log in (record applicant credentials)
 * 3. As system admin, create a job posting (with required fields set to random
 *    UUIDs/data)
 * 4. As applicant, create a new application for the job posting
 * 5. As system admin, delete the application
 * 6. Attempt to delete the same application again as system admin (should
 *    fail)
 * 7. Attempt to delete the application as applicant (should fail)
 * 8. Attempt to delete a random invalid applicationId as system admin (should
 *    fail)
 */
export async function test_api_application_system_admin_delete_compliance_and_access_control(
  connection: api.IConnection,
) {
  // 1. System admin registers & logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // Log out and log in again as admin to verify login logic (simulate context switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 2. Applicant registers & logs in
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // Log out and log in as applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 3. As system admin again, create job posting (simulate context switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: typia.random<string & tags.Format<"uuid">>(),
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Switch context to applicant and submit application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. As system admin, delete the application
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  await api.functional.atsRecruitment.systemAdmin.applications.erase(
    connection,
    {
      applicationId: application.id,
    },
  );

  // 6. Attempt to delete the same application again - should fail
  await TestValidator.error(
    "cannot delete already-deleted application",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.erase(
        connection,
        {
          applicationId: application.id,
        },
      );
    },
  );

  // 7. Attempt to delete as applicant - should fail
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("applicant cannot delete application", async () => {
    await api.functional.atsRecruitment.systemAdmin.applications.erase(
      connection,
      {
        applicationId: application.id,
      },
    );
  });

  // 8. Attempt to delete with invalid applicationId as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "system admin cannot delete non-existent application",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.erase(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
