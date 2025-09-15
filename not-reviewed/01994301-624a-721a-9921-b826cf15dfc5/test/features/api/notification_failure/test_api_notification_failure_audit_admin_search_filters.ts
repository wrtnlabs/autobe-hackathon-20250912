import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationFailure";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationFailure";

/**
 * E2E test case for auditing notification failure logs with admin-only
 * search/filter access.
 *
 * 1. Register (join) a new system administrator with unique email
 * 2. Log in as the system admin
 * 3. Attempt to access the notification failure log API as admin: a. Execute
 *    unfiltered search (basic retrieval) b. Execute search with delivery_id or
 *    failure_type filter c. Search with date range (from_date, to_date) d. Use
 *    partial match on failure_message e. Validate pagination & sorting (page,
 *    limit, sort, order) f. Use filter values that return no results
 *    (edge/empty case) g. (Security) Call endpoint with no authentication and
 *    expect error h. (Security) Call endpoint as another role's connection if
 *    possible and expect error
 * 4. Validate:
 *
 *    - Each search result matches provided filters
 *    - Pagination accurately reflects total records/pages
 *    - Unauthorized or unauthenticated access is rejected by business logic
 *    - Edge: empty page data returns zero results, not errors
 */
export async function test_api_notification_failure_audit_admin_search_filters(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const createAdmin = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createAdmin,
    });
  typia.assert(admin);

  // 2. Log in as admin to test login flow and obtain fresh session
  const loginAdmin = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IAtsRecruitmentSystemAdmin.ILogin;
  const session: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginAdmin,
    });
  typia.assert(session);

  // 3a. Basic access: retrieve without filter (default pagination)
  const page1: IPageIAtsRecruitmentNotificationFailure =
    await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(page1);
  // Pagination result sanity
  TestValidator.predicate(
    "no more than limit results",
    page1.data.length <= page1.pagination.limit,
  );

  // 3b. Filter by delivery_id and/or failure_type if data exists
  const first = page1.data[0];
  if (first) {
    // Filter by delivery_id
    if (first.delivery_id !== null && first.delivery_id !== undefined) {
      const byDelivery =
        await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
          connection,
          {
            body: { delivery_id: first.delivery_id },
          },
        );
      typia.assert(byDelivery);
      TestValidator.predicate(
        "all results match delivery_id filter",
        byDelivery.data.every((r) => r.delivery_id === first.delivery_id),
      );
    }
    // Filter by failure_type
    const byType =
      await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
        connection,
        {
          body: { failure_type: first.failure_type },
        },
      );
    typia.assert(byType);
    TestValidator.predicate(
      "all results failure_type matches",
      byType.data.every((r) => r.failure_type === first.failure_type),
    );
    // Filter by substring of failure_message
    const substr = RandomGenerator.substring(first.failure_message);
    const bySubstring =
      await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
        connection,
        {
          body: { failure_message: substr },
        },
      );
    typia.assert(bySubstring);
    TestValidator.predicate(
      "all results include substring",
      bySubstring.data.every((r) => r.failure_message.includes(substr)),
    );
    // Filter by date range
    const fromDate = first.occurred_at;
    const toDate = first.occurred_at;
    const byDate =
      await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
        connection,
        {
          body: { from_date: fromDate, to_date: toDate },
        },
      );
    typia.assert(byDate);
    TestValidator.predicate(
      "all results within date range",
      byDate.data.every(
        (r) => r.occurred_at >= fromDate && r.occurred_at <= toDate,
      ),
    );
  }

  // 3e. Pagination and sorting (reverse order by occurred_at)
  const sortDesc =
    await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
      connection,
      {
        body: { sort: "occurred_at", order: "desc", page: 1, limit: 5 },
      },
    );
  typia.assert(sortDesc);
  TestValidator.predicate(
    "results page limit respected",
    sortDesc.data.length <= 5,
  );
  TestValidator.predicate(
    "ordered descending by occurred_at",
    sortDesc.data.every(
      (r, i, arr) => i === 0 || r.occurred_at <= arr[i - 1].occurred_at,
    ),
  );

  // 3f. Edge: search returns zero results for impossible filter
  const empty =
    await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
      connection,
      {
        body: { delivery_id: typia.random<string & tags.Format<"uuid">>() },
      },
    );
  typia.assert(empty);
  TestValidator.equals(
    "no results for impossible filter",
    empty.data.length,
    0,
  );

  // 3g. Security: Unauthenticated access (connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access notification failure logs",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationFailures.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 3h. Security: (if possible) access as non-admin role (simulate by random/empty connection)
  // Not implementable here, only admin endpoint in provided SDK
}
