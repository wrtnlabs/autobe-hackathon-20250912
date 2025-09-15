import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentActorLoginHistory";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate privileged system admin access to retrieve complete details of a
 * specific actor login history entry.
 *
 * 1. Register a new system administrator (provides admin auth context).
 * 2. Register a new HR recruiter (triggers login event, producing new audit
 *    entry).
 * 3. (Implicit) HR recruiter join triggers audit login event creation in login
 *    history table.
 * 4. As system administrator, attempt to fetch the login history record for
 *    this HR recruiter using the unique login history id corresponding to
 *    their join/login event.
 * 5. Verify that all detail fields (id, actor_id, actor_type, login_succeeded,
 *    origin_ip, user_agent, login_at) are present, type-correct, and match
 *    the correct actor/user (compare actor_id and actor_type to the newly
 *    registered HR recruiter; login_succeeded=true; etc.).
 * 6. Test error handling: (a) attempt to fetch with invalid loginHistoryId;
 *    (b) attempt access from unauthorized role (e.g. create a separate HR
 *    recruiter and try as that user, must error).
 *
 * NOTE: In this test, we assume that the login history record corresponding
 * to the HR recruiter join event has the same ID as the recruiter (may not
 * be true in all systems; in a real system, you would need to look up or
 * search the login history records).
 */
export async function test_api_audit_login_history_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "test1234",
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Register a new HR recruiter (as admin is already authenticated, admin context used)
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: "test4321",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);
  // 3. At this point, an audit/trail login entry (login history) must have been generated for this HR recruiter. We do not have explicit API to list actor login histories, so we'll fetch by known/expected loginHistoryId.
  // For this test, assume the login history ID (for the recruiter's join) is equal to the recruiter's id for deterministic matching.
  // (In actual apps, there may be a /actorLoginHistories/search endpoint for listing or filtering, but in this simplified scope we must simulate.)
  // 4. System admin fetches full history details
  const actorLoginHistory =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.at(
      connection,
      {
        loginHistoryId: recruiter.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(actorLoginHistory);
  // 5. Validate all required fields and schema compliance
  TestValidator.equals(
    "login history actor_id matches recruiter",
    actorLoginHistory.actor_id,
    recruiter.id,
  );
  TestValidator.equals(
    "actor_type is hrRecruiter",
    actorLoginHistory.actor_type,
    "hrRecruiter",
  );
  TestValidator.predicate(
    "login_succeeded is true",
    actorLoginHistory.login_succeeded === true,
  );
  TestValidator.predicate(
    "login history has a valid timestamp",
    typeof actorLoginHistory.login_at === "string" &&
      actorLoginHistory.login_at.length > 0,
  );
  // origin_ip and user_agent may be null/undefined -- check existence/type only if present
  if (
    actorLoginHistory.origin_ip !== null &&
    actorLoginHistory.origin_ip !== undefined
  ) {
    TestValidator.predicate(
      "origin_ip is non-empty string",
      actorLoginHistory.origin_ip.length > 0,
    );
  }
  if (
    actorLoginHistory.user_agent !== null &&
    actorLoginHistory.user_agent !== undefined
  ) {
    TestValidator.predicate(
      "user_agent is non-empty string",
      actorLoginHistory.user_agent.length > 0,
    );
  }
  // 6.a. Attempt to get login history with random fake UUID - expect error
  await TestValidator.error(
    "login history detail with invalid id must fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.at(
        connection,
        {
          loginHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6.b. Attempt to fetch login history as unauthenticated user (clear session)
  const unauthedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access login history detail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.at(
        unauthedConn,
        {
          loginHistoryId: recruiter.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 6.c. Attempt to fetch login history as another HR recruiter (should be forbidden)
  const otherRecruiter = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "foobar123",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(otherRecruiter);
  await TestValidator.error(
    "non-admin HR recruiter cannot access actor login history detail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.at(
        connection,
        {
          loginHistoryId: recruiter.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
