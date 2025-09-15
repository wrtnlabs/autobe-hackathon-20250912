import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewQuestion";

/**
 * E2E test for listing interview questions by system administrator via
 * PATCH /atsRecruitment/systemAdmin/interviews/{interviewId}/questions.
 *
 * Scenario:
 *
 * 1. Register (join) a system admin user.
 * 2. As admin, create two interviews:
 *
 *    - InterviewWithQuestions: will represent an interview with many interview
 *         questions
 *    - InterviewWithoutQuestions: will have no associated questions (NOTE: Since
 *         question creation API is not present, we will only test listing)
 * 3. Happy Path 1: Admin lists questions for interviewWithQuestions - expect a
 *    paginated response (may be empty if no questions exist, as actual
 *    question creation depends on existing related API).
 * 4. Happy Path 2: Admin lists questions for interviewWithoutQuestions (no
 *    questions) - expect empty data array in pagination.
 * 5. Error Case: Use a random (nonexistent) interviewId, expect error on list.
 * 6. Security: Attempt to list interview questions as a non-admin (simulate
 *    with a connection with no token/header) and expect error.
 * 7. Pagination: For large sets, since we can't actually create questions
 *    here, verify that the pagination fields exist and have the correct
 *    shape in response.
 */
export async function test_api_admin_interview_questions_list_success_various_interviews(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Create interviews
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewWithQuestionsInput = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph(),
    stage: "first_phase",
    status: "scheduled",
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interviewWithoutQuestionsInput = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph(),
    stage: "final",
    status: "scheduled",
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interviewWithQuestions =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      { body: interviewWithQuestionsInput },
    );
  const interviewWithoutQuestions =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      { body: interviewWithoutQuestionsInput },
    );
  typia.assert(interviewWithQuestions);
  typia.assert(interviewWithoutQuestions);

  // 3. Happy Path: Admin lists (patch) questions for interviewWithQuestions
  const resultWithQuestions =
    await api.functional.atsRecruitment.systemAdmin.interviews.questions.index(
      connection,
      {
        interviewId: interviewWithQuestions.id,
        body: {},
      },
    );
  typia.assert(resultWithQuestions);
  TestValidator.predicate(
    "response contains pagination object",
    !!resultWithQuestions.pagination,
  );
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(resultWithQuestions.data),
  );

  // 4. Happy Path: Admin lists (patch) questions for interviewWithoutQuestions
  const resultWithoutQuestions =
    await api.functional.atsRecruitment.systemAdmin.interviews.questions.index(
      connection,
      {
        interviewId: interviewWithoutQuestions.id,
        body: {},
      },
    );
  typia.assert(resultWithoutQuestions);
  TestValidator.predicate(
    "response contains pagination object for empty set",
    !!resultWithoutQuestions.pagination,
  );
  TestValidator.equals(
    "data array empty for interview without questions",
    resultWithoutQuestions.data.length,
    0,
  );

  // 5. Error: Not-found (non-existent interviewId)
  await TestValidator.error(
    "listing questions for non-existent interviewId throws error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.questions.index(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 6. Security: Unprivileged user cannot list (simulate as unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list interview questions",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.questions.index(
        unauthConn,
        {
          interviewId: interviewWithQuestions.id,
          body: {},
        },
      );
    },
  );

  // 7. Pagination structure and logic (simulate with high limit for coverage)
  const paginated =
    await api.functional.atsRecruitment.systemAdmin.interviews.questions.index(
      connection,
      {
        interviewId: interviewWithQuestions.id,
        body: { limit: 1 as number & tags.Type<"int32"> },
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination fields exist",
    typeof paginated.pagination.limit === "number",
  );
}
