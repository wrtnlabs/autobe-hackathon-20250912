import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate authenticated HR recruiter access to their own coding test, and
 * permission enforcement for GET by {codingTestId}
 *
 * 1. Register HR recruiter (hr1) and login as hr1
 * 2. HR1 creates a job posting
 * 3. Register applicant
 * 4. Applicant logs in and applies for job posting
 * 5. HR1 assigns coding test to applicant (POST)
 * 6. HR1 fetches coding test by its id (GET), verifies contents
 * 7. Register different HR recruiter (hr2)
 * 8. HR2 logs in and tries to fetch the coding test by id (should get forbidden or
 *    not found)
 * 9. Try fetching with a non-existent id (should get not found)
 * 10. Log out and try fetching (should get unauthorized/error)
 */
export async function test_api_hr_recruiter_coding_test_get_successful_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter (hr1)
  const hr1Email = typia.random<string & tags.Format<"email">>();
  const hr1Password = RandomGenerator.alphaNumeric(10);
  const hr1: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hr1Email,
        password: hr1Password,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hr1);

  // 2. hr1 creates a job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr1.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 4. Applicant logs in and applies for the job
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
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. HR1 logs in, assigns coding test to applicant
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hr1Email,
      password: hr1Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const now = new Date();
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hr1.id,
          test_provider: "internal",
          scheduled_at: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 6. HR1 fetches coding test ID, verifies structure matches
  const getTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.at(connection, {
      codingTestId: codingTest.id,
    });
  typia.assert(getTest);
  TestValidator.equals(
    "Fetched coding test matches created",
    getTest.id,
    codingTest.id,
  );
  TestValidator.equals(
    "Owner HR matches",
    getTest.ats_recruitment_hrrecruiter_id,
    hr1.id,
  );
  TestValidator.equals(
    "Applicant matches",
    getTest.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "Application matches",
    getTest.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals("Test provider", getTest.test_provider, "internal");
  TestValidator.equals("Status matches", getTest.status, "scheduled");
  TestValidator.equals(
    "Scheduled at matches",
    getTest.scheduled_at,
    codingTest.scheduled_at,
  );

  // 7. Register a second HR recruiter (hr2)
  const hr2Email = typia.random<string & tags.Format<"email">>();
  const hr2Password = RandomGenerator.alphaNumeric(10);
  const hr2: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hr2Email,
        password: hr2Password,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hr2);

  // 8. HR2 attempts fetch -- should fail (403 or 404)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hr2Email,
      password: hr2Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "HR recruiter other than owner cannot fetch coding test",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.at(
        connection,
        {
          codingTestId: codingTest.id,
        },
      );
    },
  );

  // 9. Try with an invalid codingTestId (must not exist)
  await TestValidator.error(
    "Fetching coding test by random UUID returns not found",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.at(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 10. Log out (clear auth) and try fetch (should be unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated access is not allowed",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.at(
        unauthConn,
        {
          codingTestId: codingTest.id,
        },
      );
    },
  );
}
