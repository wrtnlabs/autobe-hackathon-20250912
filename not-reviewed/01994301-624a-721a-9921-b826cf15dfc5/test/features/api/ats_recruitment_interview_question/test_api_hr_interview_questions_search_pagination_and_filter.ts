import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewQuestion";

/**
 * Test retrieving list of interview questions as HR recruiter, including:
 *
 * - Success: all questions are listed for a valid interview by authorized
 *   recruiter.
 * - Pagination and/or filtering logic (limit, page, types, empty, last,
 *   out-of-bounds).
 * - Access denied (unauthorized recruiter not attached to interview).
 * - Not-found error (random interviewId).
 *
 * Business context: Only authorized HR recruiters can access assigned interview
 * questions. Test validates permissions, pagination, filtering, and
 * boundaries.
 *
 * Steps:
 *
 * 1. Register HR recruiter A (authorized).
 * 2. Register HR recruiter B (unauthorized).
 * 3. HR recruiter A creates an interview.
 * 4. Success tests: A lists questions for their interview (various
 *    filters/pagination).
 * 5. Negative test: B attempts to list questions for A's interview (should fail).
 * 6. Not-found test: random uuid as interview id (should fail).
 */
export async function test_api_hr_interview_questions_search_pagination_and_filter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter A
  const recruiterAEmail = typia.random<string & tags.Format<"email">>();
  const recruiterA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterAEmail,
      password: "1234",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterA);

  // 2. Register HR recruiter B
  const recruiterBEmail = typia.random<string & tags.Format<"email">>();
  const recruiterB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterBEmail,
      password: "1234",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterB);

  // 3. HR recruiter A creates an interview (random valid data)
  const createBody = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph(),
    stage: RandomGenerator.paragraph(),
    status: RandomGenerator.paragraph(),
    notes: RandomGenerator.paragraph(),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: createBody },
    );
  typia.assert(interview);

  // 4. List questions using PATCH as recruiterA
  // Default request
  let questionPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
      connection,
      {
        interviewId: interview.id,
        body: {},
      },
    );
  typia.assert(questionPage);
  TestValidator.equals(
    "interviewId matches returned questions",
    true,
    questionPage.data.every(
      (q) => q.ats_recruitment_interview_id === interview.id,
    ),
  );

  // Pagination: limit 1
  questionPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
      connection,
      {
        interviewId: interview.id,
        body: { limit: 1 },
      },
    );
  typia.assert(questionPage);
  TestValidator.equals(
    "pagination limit 1 returns one record or less",
    true,
    questionPage.data.length <= 1,
  );

  // Pagination: large page (expect possibly empty)
  questionPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
      connection,
      {
        interviewId: interview.id,
        body: { page: 1000, limit: 10 },
      },
    );
  typia.assert(questionPage);
  TestValidator.equals(
    "large pagination page returns 0 records or correct last page",
    true,
    questionPage.data.length === 0 ||
      questionPage.pagination.current === questionPage.pagination.pages - 1,
  );

  // Filtering by question_type
  if (questionPage.data.length > 0) {
    const sampleType = questionPage.data[0].question_type;
    const filteredPage =
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
        connection,
        {
          interviewId: interview.id,
          body: { question_type: sampleType },
        },
      );
    typia.assert(filteredPage);
    TestValidator.predicate(
      "all returned questions match question_type filter",
      filteredPage.data.every((q) => q.question_type === sampleType),
    );
  }

  // Sort by order, desc
  questionPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
      connection,
      {
        interviewId: interview.id,
        body: { orderBy: "order", sortDirection: "desc" },
      },
    );
  typia.assert(questionPage);
  TestValidator.predicate(
    "results ordered in descending order",
    questionPage.data.every(
      (q, idx, arr) => idx === 0 || arr[idx - 1].order >= q.order,
    ),
  );

  // 5. HR recruiter B attempts access (should fail)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterBEmail,
      password: "1234",
      name: recruiterB.name,
      department: recruiterB.department,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  await TestValidator.error(
    "access denied for unrelated recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
        connection,
        {
          interviewId: interview.id,
          body: {},
        },
      );
    },
  );

  // 6. Not-found interviewId
  await TestValidator.error(
    "not-found error for random interviewId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.index(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
