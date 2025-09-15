import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_tpm_notification_preferences_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. TPM user registration to obtain access token
  const tpmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmUserEmail,
        password: "StrongPass123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // Helper function to perform search with given filters and pagination
  async function searchNotificationPreferences(
    filters: Partial<ITaskManagementNotificationPreferences.IRequest>,
  ): Promise<IPageITaskManagementNotificationPreferences> {
    const requestBody = {
      preference_key: filters.preference_key ?? null,
      delivery_method: filters.delivery_method ?? null,
      enabled: filters.enabled ?? null,
      page: filters.page ?? null,
      limit: filters.limit ?? null,
    } satisfies ITaskManagementNotificationPreferences.IRequest;

    const result =
      await api.functional.taskManagement.tpm.notificationPreferences.indexNotificationPreferences(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(result);
    return result;
  }

  // 2. Test filtering by preference_key
  const samplePreferenceKey = "assignment";
  const resultByKey = await searchNotificationPreferences({
    preference_key: samplePreferenceKey,
    page: 1,
    limit: 10,
  });
  TestValidator.predicate(
    "preference_key filter - all results match preference_key",
    resultByKey.data.every(
      (pref) => pref.preference_key === samplePreferenceKey,
    ),
  );

  // 3. Test filtering by delivery_method
  const sampleDeliveryMethod = "email";
  const resultByDelivery = await searchNotificationPreferences({
    delivery_method: sampleDeliveryMethod,
    page: 1,
    limit: 10,
  });
  TestValidator.predicate(
    "delivery_method filter - all results match delivery_method",
    resultByDelivery.data.every(
      (pref) => pref.delivery_method === sampleDeliveryMethod,
    ),
  );

  // 4. Test filtering by enabled status
  const resultEnabled = await searchNotificationPreferences({
    enabled: true,
    page: 1,
    limit: 10,
  });
  TestValidator.predicate(
    "enabled filter - all results are enabled",
    resultEnabled.data.every((pref) => pref.enabled === true),
  );

  // 5. Test pagination correctness
  const page1 = await searchNotificationPreferences({ page: 1, limit: 5 });
  const page2 = await searchNotificationPreferences({ page: 2, limit: 5 });
  TestValidator.predicate(
    "pagination - page 1 and page 2 have distinct entries",
    !page1.data.some((p1) => page2.data.some((p2) => p1.id === p2.id)),
  );
  TestValidator.equals(
    "pagination - pagination current page matches request",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - pagination limit matches request",
    page1.pagination.limit,
    5,
  );

  // 6. Test invalid pagination parameter handling (e.g., negative page or limit)
  await TestValidator.error("negative page number should throw", async () => {
    await searchNotificationPreferences({ page: -1 });
  });
  await TestValidator.error("negative limit should throw", async () => {
    await searchNotificationPreferences({ limit: -10 });
  });

  // 7. Test empty results for a filter that yields no data
  const resultEmpty = await searchNotificationPreferences({
    preference_key: "non-existent-key",
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "empty results data length is zero",
    resultEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination current page is 1",
    resultEmpty.pagination.current,
    1,
  );

  // 8. Test unauthorized access using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access without token should throw",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.indexNotificationPreferences(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 5,
          } satisfies ITaskManagementNotificationPreferences.IRequest,
        },
      );
    },
  );
}
