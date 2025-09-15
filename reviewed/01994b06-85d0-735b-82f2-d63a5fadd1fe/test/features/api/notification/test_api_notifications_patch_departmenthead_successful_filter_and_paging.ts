import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";

/**
 * Ensure department head notification filtering and paging works as scoped to
 * user.
 *
 * 1. Register a new department head (with unique email & name)
 * 2. Login as department head and capture credentials
 * 3. Attempt notification retrieval with no filters – expect zero results (no
 *    notifications present)
 * 4. Using departmentHead's id, issue query with paging (e.g. page 1, limit 10)
 * 5. (Because no API to create actual notifications in seed, validate 0/empty
 *    result works)
 * 6. Re-auth/login (to test continued authorization), repeat query with arbitrary
 *    filter (e.g. notificationType: 'appointment_reminder')
 * 7. Attempt query with filter by impossible ID (random uuid), expect empty data
 * 8. Check unauthorized access by clearing out Authentication (headers) from
 *    connection and attempting retrieval – should get error/reject.
 */
export async function test_api_notifications_patch_departmenthead_successful_filter_and_paging(
  connection: api.IConnection,
) {
  // 1. Register new department head
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const auth: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2. Login as department head
  const loginReq = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginAuth: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: loginReq,
    });
  typia.assert(loginAuth);

  // 3. Notification retrieval - no filters: expect no data
  const emptyPage =
    await api.functional.healthcarePlatform.departmentHead.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          recipientUserId: auth.id,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "notifications page is empty for new department head",
    emptyPage.data.length,
    0,
  );

  // 4. Filter: product with impossible notificationType
  const productTypePage =
    await api.functional.healthcarePlatform.departmentHead.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          notificationType: "fake_type_never_exists",
          recipientUserId: auth.id,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(productTypePage);
  TestValidator.equals(
    "notifications non-existent type returns empty",
    productTypePage.data.length,
    0,
  );

  // 5. Test with past date (should not match anything)
  const oldPage =
    await api.functional.healthcarePlatform.departmentHead.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          recipientUserId: auth.id,
          startDate: new Date("2000-01-01T00:00:00.000Z").toISOString(),
          endDate: new Date("2000-01-02T00:00:00.000Z").toISOString(),
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(oldPage);
  TestValidator.equals(
    "old date range returns no notifications",
    oldPage.data.length,
    0,
  );

  // 6. Edge: Try querying with random recipientUserId (should not leak anything)
  const otherUserIdPage =
    await api.functional.healthcarePlatform.departmentHead.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          recipientUserId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  typia.assert(otherUserIdPage);
  TestValidator.equals(
    "random recipientUserId returns no notifications",
    otherUserIdPage.data.length,
    0,
  );

  // 7. Unauthorized: clear connection & expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated should be denied", async () => {
    await api.functional.healthcarePlatform.departmentHead.notifications.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 10,
          recipientUserId: auth.id,
        } satisfies IHealthcarePlatformNotification.IRequest,
      },
    );
  });
}
