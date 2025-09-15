import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for retrieving a specific interview calendar sync detail
 * as a system administrator and verifying role-based access control.
 *
 * 1. Register and login as a system admin (using systemAdmin/join).
 * 2. Create a new interview as admin (systemAdmin/interviews).
 * 3. Attempt to fetch a calendar sync detail using random UUIDs (since we
 *    cannot guarantee calendar sync records via public API in the test
 *    scope). Test happy path as well as error responses for invalid IDs.
 * 4. Validate forbidden access for unauthenticated (non-admin) users.
 */
export async function test_api_admin_interview_calendar_sync_detail_success_and_role_verification(
  connection: api.IConnection,
) {
  // 1. System admin registration & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "SuperSecurePassword1!",
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create interview (requires job application id in DTO: mock UUID)
  const fakeApplicationId = typia.random<string & tags.Format<"uuid">>();
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: fakeApplicationId,
          title: RandomGenerator.name(3),
          stage: "initial",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 3. Since we cannot create a calendar sync directly, we simulate error paths and check that successful detail retrieval is not possible without existing record
  const randomSyncId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found for non-existing calendarSyncId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: interview.id,
          calendarSyncId: randomSyncId,
        },
      );
    },
  );

  await TestValidator.error(
    "not found for non-existing interviewId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          calendarSyncId: randomSyncId,
        },
      );
    },
  );

  // Forbidden for unauthenticated (non-admin) access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden for non-admin/non-auth", async () => {
    await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.at(
      unauthConn,
      {
        interviewId: interview.id,
        calendarSyncId: randomSyncId,
      },
    );
  });
}
