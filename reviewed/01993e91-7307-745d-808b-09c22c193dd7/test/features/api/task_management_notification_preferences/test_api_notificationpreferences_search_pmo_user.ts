import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This test validates the notification preference search functionality for a
 * Project Management Officer (PMO) user. It includes:
 *
 * 1. PMO user registration (join) and login (authentication).
 * 2. Preparation of multiple diverse notification preferences for this PMO user.
 * 3. Searching notification preferences filtered by preference_key,
 *    delivery_method, and enabled flag.
 * 4. Validating response pagination metadata (current page, limit, total records,
 *    pages).
 * 5. Verifying only authorized PMO users can access this endpoint.
 * 6. Testing error handling with invalid inputs and unauthorized access.
 *
 * The test ensures the endpoint correctly implements filtering, pagination, and
 * role-based authorization.
 */
export async function test_api_notificationpreferences_search_pmo_user(
  connection: api.IConnection,
) {
  // 1. PMO User Registration
  const joinBody = {
    email: `pmo_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: joinBody,
    });
  typia.assert(pmoUser);

  // 2. Explicit PMO login to obtain auth token
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loginUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Prepare multiple notification preferences for this user
  // Note: There is no create API for notification preferences in given APIs.
  // We assume the test environment preloads these entries. Otherwise, this is a limitation.

  // Generate sample preference keys and delivery methods
  const preferenceKeys = ["assignment", "status_change", "comment"] as const;
  const deliveryMethods = ["email", "push", "sms"] as const;

  // Data sets for test filtering logic (simulated expected filters)
  const preferencesDataEntries = ArrayUtil.repeat(6, (index) => {
    const key = RandomGenerator.pick(preferenceKeys);
    const delivery = RandomGenerator.pick(deliveryMethods);
    return {
      user_id: pmoUser.id,
      preference_key: key,
      delivery_method: delivery,
      enabled: index % 2 === 0, // alternating true/false
    } satisfies Omit<
      ITaskManagementNotificationPreferences,
      "id" | "created_at" | "updated_at" | "deleted_at"
    >;
  });

  // 4. Perform search queries with different filters

  // 4.1 Search by preference_key
  const filterKey = preferenceKeys[0];
  const searchByKeyResponse =
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          preference_key: filterKey,
          page: 1,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  typia.assert(searchByKeyResponse);

  // Validate all returned entries have preference_key === filterKey
  for (const entry of searchByKeyResponse.data) {
    TestValidator.equals(
      "preference_key matches filter",
      entry.preference_key,
      filterKey,
    );
  }

  // Validate pagination info
  TestValidator.equals(
    "pagination current page equals 1",
    searchByKeyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals 10",
    searchByKeyResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages equals correct ceiling",
    searchByKeyResponse.pagination.pages,
    Math.ceil(
      searchByKeyResponse.pagination.records /
        searchByKeyResponse.pagination.limit,
    ),
  );

  // 4.2 Search by delivery_method
  const filterDelivery = deliveryMethods[1];
  const searchByDeliveryResponse =
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          delivery_method: filterDelivery,
          page: 1,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  typia.assert(searchByDeliveryResponse);

  // Validate all returned entries have delivery_method === filterDelivery
  for (const entry of searchByDeliveryResponse.data) {
    TestValidator.equals(
      "delivery_method matches filter",
      entry.delivery_method,
      filterDelivery,
    );
  }

  // 4.3 Search by enabled flag
  const filterEnabled = true;
  const searchByEnabledResponse =
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          enabled: filterEnabled,
          page: 1,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  typia.assert(searchByEnabledResponse);

  // Validate all returned entries have enabled === filterEnabled
  for (const entry of searchByEnabledResponse.data) {
    TestValidator.equals(
      "enabled flag matches filter",
      entry.enabled,
      filterEnabled,
    );
  }

  // 5. Test unauthorized access
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  });

  // 6. Test invalid request payloads - e.g., invalid page or limit values
  await TestValidator.error("invalid page number is rejected", async () => {
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          page: -1,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  });

  await TestValidator.error("invalid limit number is rejected", async () => {
    await api.functional.taskManagement.pmo.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  });
}
