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
 * Comprehensive E2E workflow and permission validation for system admin
 * retrieving job application detail.
 *
 * 1. Applicant registration and login
 * 2. Applicant uploads a resume
 * 3. HR recruiter registration and login
 * 4. HR recruiter creates job posting
 * 5. Applicant applies to job posting
 * 6. System admin registration and login
 * 7. System admin fetches application detail and checks referential integrity
 * 8. Admin tries to fetch with non-existent applicationId and expects error
 */
export async function test_api_application_detail_access_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Applicant registration and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
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

  // 2. Applicant uploads a resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(2),
        parsed_name: RandomGenerator.name(),
        parsed_email: typia.random<string & tags.Format<"email">>(),
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: null,
        parsed_education_summary: RandomGenerator.paragraph({ sentences: 8 }),
        parsed_experience_summary: RandomGenerator.paragraph({ sentences: 10 }),
        skills_json: JSON.stringify([
          RandomGenerator.paragraph({ sentences: 3 }),
        ]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 3. HR recruiter registration and login
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);

  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. HR recruiter creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiterJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 3500 + Math.floor(Math.random() * 1000),
          salary_range_max: 5000 + Math.floor(Math.random() * 2000),
          application_deadline: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant logins again and applies to job
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
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 6. System admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(adminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 7. System admin requests application details
  const output =
    await api.functional.atsRecruitment.systemAdmin.applications.at(
      connection,
      {
        applicationId: application.id,
      },
    );
  typia.assert(output);

  // Check all relationships and fields match/referential integrity
  TestValidator.equals("application ID matches", output.id, application.id);
  TestValidator.equals(
    "applicant ID matches",
    output.applicant_id,
    applicantJoin.id,
  );
  TestValidator.equals(
    "job posting ID matches",
    output.job_posting_id,
    jobPosting.id,
  );
  TestValidator.equals("resume ID matches", output.resume_id, resume.id);
  TestValidator.predicate("application is not deleted", !output.deleted_at);
  TestValidator.predicate(
    "application created and updated timestamps exist",
    Boolean(output.created_at) && Boolean(output.updated_at),
  );
  TestValidator.predicate(
    "application is submitted and not empty",
    output.current_status.length > 0,
  );

  // 8. Try to fetch non-existent applicationId
  await TestValidator.error(
    "retrieving non-existent applicationId returns error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.at(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
