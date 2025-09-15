import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentActorLoginHistory";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentActorLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentActorLoginHistory";

/**
 * This test validates that a system administrator can search and filter actor
 * login histories in the ATS system. To do so, the test creates a system admin,
 * HR recruiter, and applicant—each registered with their respective join
 * endpoints. Since join endpoints also trigger an authentication event, these
 * steps establish at least one login audit for each actor. The test then
 * switches/re-authenticates as the admin to call the audit trail list/search
 * endpoint. It validates that global queries list all recent login events, that
 * filtering by actor ID, type, or login result yields only relevant records,
 * and that pagination metadata and all DTO fields are correct. It validates
 * permissions enforcement by simulating unauthorized access (connection without
 * Authorization header). As type error testing is prohibited, malformed query
 * tests are limited to business logic errors (e.g., page out of range). This
 * ensures comprehensive audit capability validation, strict schema conformance,
 * and proper permission checks without violating type safety.
 */
export async function test_api_audit_trail_login_history_search_filter(
  connection: api.IConnection,
) {
  // 1. Register a system admin
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

  // 2. Register an HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 3. Register an applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Log in again as system admin to retain authorization
  const systemAdminAgain = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: systemAdmin.name,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    },
  );
  typia.assert(systemAdminAgain);

  // 5. Query login histories globally (no filters)
  const allHistory =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate(
    "pagination metadata present on all login history query",
    !!allHistory.pagination && Array.isArray(allHistory.data),
  );
  TestValidator.predicate(
    "at least one login event for each actor should exist",
    [systemAdmin.id, hrRecruiter.id, applicant.id].every((actorId) =>
      allHistory.data.some((h) => h.actor_id === actorId),
    ),
  );

  // 6. Filter by actor_id (hrRecruiter)
  const hrHistory =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { actor_id: hrRecruiter.id },
      },
    );
  typia.assert(hrHistory);
  TestValidator.predicate(
    "actor_id filter only returns HR's login history records",
    hrHistory.data.every((h) => h.actor_id === hrRecruiter.id),
  );

  // 7. Filter by actor_type ("hrRecruiter")
  const byType =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { actor_type: "hrRecruiter" },
      },
    );
  typia.assert(byType);
  TestValidator.predicate(
    "actor_type filter only returns type hrRecruiter",
    byType.data.every((h) => h.actor_type === "hrRecruiter"),
  );

  // 8. Filter by login_succeeded=true
  const onlySuccess =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { login_succeeded: true },
      },
    );
  typia.assert(onlySuccess);
  TestValidator.predicate(
    "all login_succeeded records are successful",
    onlySuccess.data.every((h) => h.login_succeeded === true),
  );

  // 9. Filter with impossible query (by impossible actor_id)
  const none =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { actor_id: typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(none);
  TestValidator.equals(
    "impossible actor_id yields no records",
    none.data.length,
    0,
  );

  // 10. Filter by date range (all events should fall within now +/- 1d)
  const now = new Date();
  const gte = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const lte = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const dateFiltered =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { login_at_gte: gte, login_at_lte: lte },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "all events in date range",
    dateFiltered.data.every((h) => h.login_at >= gte && h.login_at <= lte),
  );

  // 11. Business logic error: page number out of range
  const bigPage = 999999 as number & tags.Type<"int32">;
  const bigPageRes =
    await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
      connection,
      {
        body: { page: bigPage },
      },
    );
  typia.assert(bigPageRes);
  TestValidator.equals(
    "page out of range returns empty data",
    bigPageRes.data.length,
    0,
  );

  // 12. Unauthorized access: remove Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthorized cannot access history endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.actorLoginHistories.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
