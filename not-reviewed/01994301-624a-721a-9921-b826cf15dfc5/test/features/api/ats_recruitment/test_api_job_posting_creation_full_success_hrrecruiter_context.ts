import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates full HR recruiter job posting creation procedure including
 * error cases.
 *
 * 1. Register & authenticate as a new HR recruiter (via join).
 * 2. Create job employment type (unique name, is_active true).
 * 3. Create job posting state (unique state_code, label, is_active,
 *    sort_order).
 * 4. Create job posting referencing the newly created employment type and
 *    state, filling all required and some optional fields, with unique
 *    title.
 * 5. Ensure posting fields and relations are correct (IDs, business values,
 *    foreign keys).
 * 6. Negative: attempt posting with wrong employment type/state IDs (expect
 *    error)
 * 7. Negative: duplicate posting title for this recruiter (expect error)
 * 8. Negative: posting creation without authentication (expect error).
 */
export async function test_api_job_posting_creation_full_success_hrrecruiter_context(
  connection: api.IConnection,
) {
  // 1. Register & authenticate HR recruiter
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinBody,
  });
  typia.assert(recruiter);
  TestValidator.predicate(
    "recruiter is_active true",
    recruiter.is_active === true,
  );

  // 2. Create job employment type
  const jobEmpTypeBody = {
    name: RandomGenerator.name(2) + "." + RandomGenerator.alphaNumeric(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const jobEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: jobEmpTypeBody },
    );
  typia.assert(jobEmpType);
  TestValidator.equals("employment type is_active", jobEmpType.is_active, true);
  TestValidator.equals(
    "employment type name",
    jobEmpType.name,
    jobEmpTypeBody.name,
  );

  // 3. Create job posting state
  const postingStateBody = {
    state_code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: postingStateBody },
    );
  typia.assert(postingState);
  TestValidator.equals("posting state is_active", postingState.is_active, true);
  TestValidator.equals(
    "posting state state_code",
    postingState.state_code,
    postingStateBody.state_code,
  );

  // 4. Create job posting with all required and various optional fields (for success)
  const postBody = {
    hr_recruiter_id: recruiter.id,
    job_employment_type_id: jobEmpType.id,
    job_posting_state_id: postingState.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    salary_range_min: Math.floor(Math.random() * 1000) * 1000,
    salary_range_max: Math.floor(Math.random() * 5000) * 1000 + 100000,
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 15,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const posting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: postBody },
    );
  typia.assert(posting);
  TestValidator.equals(
    "posting recruiter id matches",
    posting.hr_recruiter_id,
    recruiter.id,
  );
  TestValidator.equals(
    "posting emp type id matches",
    posting.job_employment_type_id,
    jobEmpType.id,
  );
  TestValidator.equals(
    "posting state id matches",
    posting.job_posting_state_id,
    postingState.id,
  );
  TestValidator.equals("posting title matches", posting.title, postBody.title);
  TestValidator.equals("posting is_visible true", posting.is_visible, true);

  // 5. Negative: invalid job employment type id (expects error)
  await TestValidator.error(
    "invalid employment type reference should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
        connection,
        {
          body: {
            ...postBody,
            job_employment_type_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
  // 6. Negative: invalid job posting state id (expects error)
  await TestValidator.error(
    "invalid posting state reference should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
        connection,
        {
          body: {
            ...postBody,
            job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
  // 7. Negative: duplicate job title for same recruiter (expects error)
  await TestValidator.error(
    "duplicate job title for recruiter should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
        connection,
        {
          body: { ...postBody },
        },
      );
    },
  );
  // 8. Negative: job posting creation without authentication (simulate clean connection, should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated job posting attempt fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
        unauthConn,
        {
          body: postBody,
        },
      );
    },
  );
}
