import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E scenario for updating an interview in ATS as HR recruiter.
 *
 * 1. Register HR recruiter (join).
 * 2. Login as HR recruiter.
 * 3. Create an interview (attach to random applicationId).
 * 4. Update the interview using PUT
 *    /atsRecruitment/hrRecruiter/interviews/{interviewId}.
 *
 *    - Update title, stage, notes, status.
 * 5. Assert that update is reflected: title, stage, notes, status, updated_at
 *    (should advance).
 * 6. Test invalid update attempts:
 *
 *    - Invalid interviewId
 *    - Unauthorized (simulate fresh connection)
 * 7. All expectations are validated with typia.assert/TestValidator.
 */
export async function test_api_hr_interview_update_with_full_flow(
  connection: api.IConnection,
) {
  // Step 1: Register HR recruiter
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const joinOutput = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinOutput);

  // Step 2: Login as HR
  const loginOutput = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email,
      password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(loginOutput);
  TestValidator.equals(
    "login email matches join email",
    loginOutput.email,
    email,
  );

  // Step 3: Create candidate interview referencing a fabricated application id
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const createInterviewInput = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "phone",
      "first_phase",
      "tech_round",
      "hr",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "rescheduled",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const initialInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: createInterviewInput,
      },
    );
  typia.assert(initialInterview);

  // Step 4: Update the interview (all allowed fields)
  const updateInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "final",
      "hr",
      "tech_round",
    ] as const),
    status: RandomGenerator.pick([
      "completed",
      "cancelled",
      "rescheduled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IAtsRecruitmentInterview.IUpdate;
  const updated =
    await api.functional.atsRecruitment.hrRecruiter.interviews.update(
      connection,
      {
        interviewId: initialInterview.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "interview id unchanged",
    updated.id,
    initialInterview.id,
  );
  TestValidator.equals("title updated", updated.title, updateInput.title);
  TestValidator.equals("stage updated", updated.stage, updateInput.stage);
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.equals("notes updated", updated.notes, updateInput.notes);
  TestValidator.notEquals(
    "updated_at advanced",
    updated.updated_at,
    initialInterview.updated_at,
  );

  // Step 5: Update invalid interviewId (should fail)
  await TestValidator.error(
    "update with invalid interviewId should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.update(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );

  // Step 6: Unauthorized update (simulate unauthenticated state)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.update(
      unauthConn,
      {
        interviewId: initialInterview.id,
        body: updateInput,
      },
    );
  });
}
