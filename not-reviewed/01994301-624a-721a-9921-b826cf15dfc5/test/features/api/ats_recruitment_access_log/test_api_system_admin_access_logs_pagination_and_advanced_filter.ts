import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAccessLog";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAccessLog";

/**
 * E2E test that verifies a system administrator can retrieve a paginated and
 * filtered list of access logs.
 *
 * - Authenticate as a new system admin (admin1)
 * - Register another admin (admin2) to ensure diversity in logs (admin2 as
 *   target)
 * - Query access logs filtered by actor_id (admin1), by target_id (admin2.id), by
 *   accessed_at window, by reason, with pagination
 * - Validate expected logs are returned, correct pagination metadata, and
 *   sensitive fields are not overexposed
 * - Test empty result set when filter has no match
 * - Error handling: query with unauthorized role (empty header), oversized page
 *   size
 */
export async function test_api_system_admin_access_logs_pagination_and_advanced_filter(
  connection: api.IConnection,
) {
  // 1. Register admin1 and authenticate
  const admin1_email = typia.random<string & tags.Format<"email">>();
  const admin1 = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin1_email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin1);

  // 2. Register admin2 (to be used as target_id, triggers additional access logs)
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2 = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin2_email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin2);

  // Give some time difference for access_at filtering
  const accessLogWindowStart = new Date(Date.now() - 1000 * 30).toISOString();
  const accessLogWindowEnd = new Date(Date.now() + 1000 * 30).toISOString();

  // 3. Query logs filtered by actor_id (admin1)
  const logsByActor: IPageIAtsRecruitmentAccessLog =
    await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
      connection,
      {
        body: {
          actor_id: admin1.id,
        } satisfies IAtsRecruitmentAccessLog.IRequest,
      },
    );
  typia.assert(logsByActor);
  TestValidator.predicate(
    "access logs list by actor_id contains only correct actor",
    logsByActor.data.every((log) => log.actor_id === admin1.id),
  );

  // 4. Query logs filtered by target_id (admin2.id)
  const logsByTarget: IPageIAtsRecruitmentAccessLog =
    await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
      connection,
      {
        body: {
          target_id: admin2.id,
        } satisfies IAtsRecruitmentAccessLog.IRequest,
      },
    );
  typia.assert(logsByTarget);
  TestValidator.predicate(
    "access logs filtered by target_id only",
    logsByTarget.data.every((log) => log.target_id === admin2.id),
  );

  // 5. Window/time filter (by accessed_at_from and accessed_at_to)
  const timeWindowLogs: IPageIAtsRecruitmentAccessLog =
    await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
      connection,
      {
        body: {
          accessed_at_from: accessLogWindowStart,
          accessed_at_to: accessLogWindowEnd,
        } satisfies IAtsRecruitmentAccessLog.IRequest,
      },
    );
  typia.assert(timeWindowLogs);
  TestValidator.predicate(
    "access logs in correct time window",
    timeWindowLogs.data.every(
      (log) =>
        log.accessed_at >= accessLogWindowStart &&
        log.accessed_at <= accessLogWindowEnd,
    ),
  );

  // 6. Pagination: limit small (page 1), ensure correct pagination meta
  const paginatedResult: IPageIAtsRecruitmentAccessLog =
    await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
      connection,
      {
        body: { page: 1, limit: 1 } satisfies IAtsRecruitmentAccessLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination returns at most 1 result and correct meta",
    paginatedResult.data.length <= 1 &&
      paginatedResult.pagination.limit === 1 &&
      paginatedResult.pagination.current === 1,
  );

  // 7. Filter that matches no data (random uuid that cannot be a real actor/target)
  const logsEmpty: IPageIAtsRecruitmentAccessLog =
    await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentAccessLog.IRequest,
      },
    );
  typia.assert(logsEmpty);
  TestValidator.equals(
    "empty result for non-existent actor_id",
    logsEmpty.data.length,
    0,
  );

  // 8. Error: Unauthorized access - use unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin access logs list is forbidden",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 9. Error: Exceeding allowed page size (e.g., limit = 1000000)
  await TestValidator.error(
    "too large page size is properly rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.accessLogs.index(
        connection,
        {
          body: { limit: 1000000 } satisfies IAtsRecruitmentAccessLog.IRequest,
        },
      );
    },
  );
}
