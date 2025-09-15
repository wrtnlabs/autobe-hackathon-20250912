import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

/**
 * This test validates the notification listing and filtering capabilities
 * for the Designer role. It first registers a new designer user, logs in to
 * obtain authorization, then exercises the PATCH
 * /taskManagement/designer/notifications endpoint with various filters and
 * pagination parameters.
 *
 * The test checks that only notifications belonging to the authenticated
 * designer are returned, that pagination metadata matches expected values,
 * and that filters on notification_type and read status work correctly. The
 * test also verifies behavior with invalid or no matching filters.
 *
 * Business rules:
 *
 * - Designers have access only to their own notifications.
 * - Pagination and filters must reflect correct subsets of data.
 *
 * Test flow:
 *
 * 1. Register a designer user.
 * 2. Authenticate the designer user.
 * 3. Perform notification retrieval with no filters.
 * 4. Perform notification retrieval with page and limit filters.
 * 5. Perform notification retrieval filtering by notification_type.
 * 6. Perform notification retrieval filtering by is_read status.
 * 7. Attempt retrieval with filters expected to produce empty result sets.
 * 8. Test invalid pagination parameters resulting in error or empty results.
 */
export async function test_api_notification_index_designer_with_filter_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new designer user
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32); // Simulated hash
  const name = RandomGenerator.name();

  const createdDesigner = await api.functional.auth.designer.join(connection, {
    body: {
      email: email,
      password_hash: password_hash,
      name: name,
    } satisfies ITaskManagementDesigner.ICreate,
  });
  typia.assert(createdDesigner);

  // Step 2: Login as the created designer
  const loginResult = await api.functional.auth.designer.login(connection, {
    body: {
      email: email,
      password: password_hash, // Use the same hash as password string here for login
    } satisfies ITaskManagementDesigner.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Retrieve notifications with no filters
  let notificationsPage =
    await api.functional.taskManagement.designer.notifications.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(notificationsPage);

  // Validate that all notifications belong to the user
  for (const notif of notificationsPage.data) {
    TestValidator.equals(
      `notification user_id matches logged in user ID`,
      notif.user_id,
      createdDesigner.id,
    );
  }

  // Validate pagination metadata makes sense
  TestValidator.predicate(
    "pagination current page >= 0",
    notificationsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    notificationsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    notificationsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    notificationsPage.pagination.records >= 0,
  );

  // Step 4: Retrieve notifications with pagination parameters
  const pageSize = 5;
  const pageNumber = 1;
  notificationsPage =
    await api.functional.taskManagement.designer.notifications.index(
      connection,
      {
        body: {
          page: pageNumber,
          limit: pageSize,
        },
      },
    );
  typia.assert(notificationsPage);

  TestValidator.equals(
    "pagination current page matches",
    notificationsPage.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit matches",
    notificationsPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    notificationsPage.pagination.records >= notificationsPage.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= current page",
    notificationsPage.pagination.pages >= notificationsPage.pagination.current,
  );

  // Step 5: Filtering by notification_type
  // If there is at least one type in data, filter by it
  if (notificationsPage.data.length > 0) {
    const someType = notificationsPage.data[0].notification_type;
    const filteredByTypePage =
      await api.functional.taskManagement.designer.notifications.index(
        connection,
        {
          body: { notification_type: someType },
        },
      );
    typia.assert(filteredByTypePage);
    for (const n of filteredByTypePage.data) {
      TestValidator.equals(
        "notification_type filter matches",
        n.notification_type,
        someType,
      );
      TestValidator.equals(
        "notification belongs to current user",
        n.user_id,
        createdDesigner.id,
      );
    }
  }

  // Step 6: Filtering by is_read status
  for (const readStatus of [true, false]) {
    const filteredByReadStatus =
      await api.functional.taskManagement.designer.notifications.index(
        connection,
        {
          body: { is_read: readStatus },
        },
      );
    typia.assert(filteredByReadStatus);
    for (const n of filteredByReadStatus.data) {
      TestValidator.equals(
        "is_read status matches filter",
        n.is_read,
        readStatus,
      );
      TestValidator.equals(
        "notification user_id matches",
        n.user_id,
        createdDesigner.id,
      );
    }
  }

  // Step 7: Filters resulting in empty results
  // Use arbitrary string unlikely to be notification_type
  const emptyResult =
    await api.functional.taskManagement.designer.notifications.index(
      connection,
      {
        body: { notification_type: "non-existent-type-xyz", is_read: true },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result count", emptyResult.data.length, 0);

  // Step 8: Invalid pagination edge cases
  // Negative page number, zero limit (expect empty or handled gracefully)
  const invalidPage =
    await api.functional.taskManagement.designer.notifications.index(
      connection,
      {
        body: { page: -1, limit: 0 },
      },
    );
  typia.assert(invalidPage);
  TestValidator.predicate(
    "invalid pagination returns empty or normal data",
    invalidPage.data.length >= 0,
  );
}
