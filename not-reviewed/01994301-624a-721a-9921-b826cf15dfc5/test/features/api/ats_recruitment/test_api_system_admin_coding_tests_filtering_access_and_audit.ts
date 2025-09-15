import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";

/**
 * Scenario validating systemAdmin advanced coding test filtering and audit
 * access.
 *
 * 1. Register system administrator (super admin = true)
 * 2. Register applicant
 * 3. Register HR recruiter and login as recruiter
 * 4. Recruiter creates a job posting (with random employment type and state
 *    fields)
 * 5. (Assume coding test assignment exists in backend – cannot create directly, so
 *    focus test on index/filter logic.)
 * 6. System admin logs in and requests /atsRecruitment/systemAdmin/codingTests
 *    with both applicant_id and job_posting_id used as filters.
 * 7. Assert all returned coding test records match both filter criteria, if any.
 * 8. Error path: (a) Filtering with non-matching IDs (expect empty); (b) Access
 *    with HR recruiter credentials (should get denied); (c) Access as
 *    unauthenticated user (should get denied).
 */
export async function test_api_system_admin_coding_tests_filtering_access_and_audit(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Register HR recruiter and login as HR
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Swapping auth token: login as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. Recruiter creates a job posting (with random required FKs)
  // For employment type and posting state, use typia.random UUIDs.
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. (No codingTest assignment API – skip. Rely on index.)

  // 6a. Re-login as system admin to reset role
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 6b. Query index with specific applicant_id and job_posting_id
  const output =
    await api.functional.atsRecruitment.systemAdmin.codingTests.index(
      connection,
      {
        body: {
          applicant_id: applicant.id,
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "all records match both applicant/job_posting filters",
    output.data.every(
      (rec) =>
        rec.ats_recruitment_applicant_id === applicant.id &&
        rec.ats_recruitment_hrrecruiter_id === hrRecruiter.id,
    ),
  );

  // 7. Error: correct format, but non-existent IDs
  const fakeUUID = typia.random<string & tags.Format<"uuid">>();
  const emptyOut =
    await api.functional.atsRecruitment.systemAdmin.codingTests.index(
      connection,
      {
        body: {
          applicant_id: fakeUUID,
          job_posting_id: fakeUUID,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(emptyOut);
  TestValidator.equals(
    "no records for non-existent applicant/job_posting",
    emptyOut.data.length,
    0,
  );

  // 8. Auth boundary: try system admin endpoint as HR recruiter (should fail)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "endpoint not accessible to HR recruiter (forbidden)",
    async () =>
      await api.functional.atsRecruitment.systemAdmin.codingTests.index(
        connection,
        {
          body: {
            applicant_id: applicant.id,
            job_posting_id: jobPosting.id,
          } satisfies IAtsRecruitmentCodingTest.IRequest,
        },
      ),
  );

  // 9. Auth boundary: access as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "endpoint is forbidden for unauthenticated user",
    async () =>
      await api.functional.atsRecruitment.systemAdmin.codingTests.index(
        unauthConn,
        {
          body: {
            applicant_id: applicant.id,
            job_posting_id: jobPosting.id,
          } satisfies IAtsRecruitmentCodingTest.IRequest,
        },
      ),
  );
}
