import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System admin interview deletion and audit soft-deletion scenario
 *
 * - Registers a system admin
 * - Authenticates as admin
 * - Admin creates an interview session
 * - Admin soft-deletes the interview via DELETE
 *   /atsRecruitment/systemAdmin/interviews/{interviewId}
 * - Asserts that deletion succeeds (void return, but no error is thrown)
 * - Negative: Deleting non-existent interview triggers error
 * - Negative: Deleting an already deleted interview triggers error
 * - Negative: Unauthenticated user (no login) cannot delete interview
 *
 * (Note: No API to query deleted interviews or audit logs directly, so only
 * flow and error validation can be performed.)
 */
export async function test_api_admin_interview_deletion_and_audit(
  connection: api.IConnection,
) {
  // Register and authenticate as system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password,
      name,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token is present after join",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // Login again for token/authorization check
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      password,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Create interview as admin
  const fakeApplicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewCreate = {
    ats_recruitment_application_id: fakeApplicationId,
    title: RandomGenerator.name(3),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      { body: interviewCreate },
    );
  typia.assert(interview);
  TestValidator.equals(
    "created interview is correct stage",
    interview.stage,
    interviewCreate.stage,
  );
  TestValidator.equals(
    "created interview is correct status",
    interview.status,
    interviewCreate.status,
  );
  TestValidator.equals(
    "created interview is correct application id",
    interview.ats_recruitment_application_id,
    interviewCreate.ats_recruitment_application_id,
  );

  // Successful deletion: admin deletes interview
  await api.functional.atsRecruitment.systemAdmin.interviews.erase(connection, {
    interviewId: interview.id,
  });
  TestValidator.predicate(
    "interview erase request succeeded (no error thrown)",
    true,
  );

  // Negative: Deleting non-existent interview (random interviewId)
  await TestValidator.error(
    "deleting non-existent interview should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.erase(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Negative: Deleting already deleted interview (double deletion)
  await TestValidator.error(
    "deleting already deleted interview should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.erase(
        connection,
        { interviewId: interview.id },
      );
    },
  );

  // Negative: Unauthenticated deletion attempt (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete interview",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.erase(
        unauthConn,
        {
          interviewId: interview.id,
        },
      );
    },
  );
}
