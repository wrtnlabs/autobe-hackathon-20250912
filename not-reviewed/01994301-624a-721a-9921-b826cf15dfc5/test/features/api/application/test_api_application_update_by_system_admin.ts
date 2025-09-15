import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System administrator updates an application end-to-end scenario:
 *
 * 1. Applicant registers and uploads resume
 * 2. HR recruiter registers & posts a job
 * 3. Applicant applies to job with resume
 * 4. System admin registers & logs in
 * 5. System admin updates application with new resume/status
 * 6. Failures: updating using non-existent resumeId/applicationId, other roles
 *    cannot update
 */
export async function test_api_application_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);
  // Upload two resumes for the applicant
  const resume1 = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume1);
  const resume2 = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume2);
  // 2. Register and login HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);
  // HR creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);
  // 3. Applicant logs in and applies to job posting with resume1
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume1.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);
  // 4. Register & login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  // 5. System admin updates application: swaps to resume2, changes status
  const updatePayload = {
    resume_id: resume2.id,
    current_status: RandomGenerator.pick([
      "submitted",
      "screening",
      "interview",
      "accepted",
      "rejected",
    ] as const),
    last_state_change_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentApplication.IUpdate;
  const updated =
    await api.functional.atsRecruitment.systemAdmin.applications.update(
      connection,
      {
        applicationId: application.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "application update succeeds, resume replaced",
    updated.resume_id,
    resume2.id,
  );
  TestValidator.equals(
    "status changed matches",
    updated.current_status,
    updatePayload.current_status,
  );
  // 6a. System admin tries to update with non-existent resumeId
  await TestValidator.error(
    "cannot update with invalid resume_id",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.update(
        connection,
        {
          applicationId: application.id,
          body: {
            resume_id: typia.random<string & tags.Format<"uuid">>(), // assuming not found
          } satisfies IAtsRecruitmentApplication.IUpdate,
        },
      );
    },
  );
  // 6b. System admin tries invalid applicationId
  await TestValidator.error(
    "cannot update non-existent applicationId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.update(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: updatePayload,
        },
      );
    },
  );
  // 6c. Permission boundary check: HR recruiter cannot use systemAdmin update API
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "hr recruiter cannot update via systemAdmin route",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.update(
        connection,
        {
          applicationId: application.id,
          body: updatePayload,
        },
      );
    },
  );
  // 6d. Permission boundary check: applicant cannot use systemAdmin update API
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot update via systemAdmin route",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.update(
        connection,
        {
          applicationId: application.id,
          body: updatePayload,
        },
      );
    },
  );
}
