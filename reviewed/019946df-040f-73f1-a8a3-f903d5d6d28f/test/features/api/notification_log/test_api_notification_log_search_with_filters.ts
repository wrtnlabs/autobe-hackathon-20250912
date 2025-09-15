import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsNotificationLog";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsNotificationLog";

/**
 * This E2E test function validates the search and filtering functionality of
 * notification logs for system administrators within the Enterprise LMS
 * platform. It ensures that only authenticated system administrators can
 * perform this search, that various filters such as notification types,
 * recipient identifiers, delivery status, and sent time ranges are correctly
 * handled, and that pagination is correctly processed.
 *
 * The workflow involves:
 *
 * 1. Creating and authenticating a system admin user via the join and login
 *    endpoints.
 * 2. Using the authenticated context to invoke the notification logs search with
 *    different filter combinations.
 * 3. Testing pagination parameters like page and limit.
 * 4. Verifying that the returned notification logs comply with the search filters
 *    and pagination metadata.
 * 5. Ensuring security by verifying that only system admin users can perform this
 *    operation (implicitly tested by authentication context).
 *
 * Each step validates the API responses using typia.assert for strict type
 * checking and TestValidator for business logic validation. The test also
 * covers no filter, partial filters, multiple filters, and pagination scenarios
 * to cover a range of typical use cases.
 */
export async function test_api_notification_log_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a system administrator user
  const systemAdminCreate = {
    email: `sysadmin-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: "hash1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreate,
    });
  typia.assert(systemAdmin);

  // Step 2: Login as the system administrator to obtain JWT tokens
  const loginCredentials = {
    email: systemAdminCreate.email,
    password_hash: systemAdminCreate.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginCredentials,
    });
  typia.assert(systemAdminLogin);

  // Step 3: Basic search without filters - retrieve first page with default limit
  const searchRequestEmpty = {
    page: 0,
    limit: 10,
  } satisfies IEnterpriseLmsNotificationLog.IRequest;

  const resultEmpty: IPageIEnterpriseLmsNotificationLog.ISummary =
    await api.functional.enterpriseLms.systemAdmin.notificationLogs.search(
      connection,
      {
        body: searchRequestEmpty,
      },
    );
  typia.assert(resultEmpty);

  TestValidator.predicate(
    "no filter search returns records",
    Array.isArray(resultEmpty.data),
  );
  TestValidator.predicate(
    "pagination limit respected",
    resultEmpty.pagination.limit === 10,
  );
  TestValidator.equals(
    "pagination current page is correct",
    resultEmpty.pagination.current,
    0,
  );

  // Step 4: Search with multiple filters: notification_type, delivery_status, recipient_identifier
  if (resultEmpty.data.length > 0) {
    // Pick filters from first record
    const firstLog = resultEmpty.data[0];
    const notificationType = firstLog.notification_type ?? null;
    const deliveryStatus = firstLog.delivery_status ?? null;
    const recipientIdentifier = firstLog.recipient_identifier ?? null;

    const searchRequestMultiple = {
      notification_type: notificationType,
      delivery_status: deliveryStatus,
      recipient_identifier: recipientIdentifier,
      page: 0,
      limit: 7,
    } satisfies IEnterpriseLmsNotificationLog.IRequest;

    const resultMultiple: IPageIEnterpriseLmsNotificationLog.ISummary =
      await api.functional.enterpriseLms.systemAdmin.notificationLogs.search(
        connection,
        {
          body: searchRequestMultiple,
        },
      );
    typia.assert(resultMultiple);

    for (const log of resultMultiple.data) {
      if (notificationType !== null && notificationType !== undefined) {
        TestValidator.equals(
          "notification_type filter matches",
          log.notification_type,
          notificationType,
        );
      }
      if (deliveryStatus !== null && deliveryStatus !== undefined) {
        TestValidator.equals(
          "delivery_status filter matches",
          log.delivery_status,
          deliveryStatus,
        );
      }
      if (recipientIdentifier !== null && recipientIdentifier !== undefined) {
        TestValidator.equals(
          "recipient_identifier filter matches",
          log.recipient_identifier,
          recipientIdentifier,
        );
      }
    }

    TestValidator.predicate(
      "pagination limit respected for multiple filters",
      resultMultiple.pagination.limit === 7,
    );
    TestValidator.equals(
      "pagination current page is correct",
      resultMultiple.pagination.current,
      0,
    );
  }

  // Step 5: Search with sent_at_from and sent_at_to filter (date range)
  if (resultEmpty.data.length > 0) {
    // sent_at property is nullable
    const firstEntry = resultEmpty.data[0];
    const lastEntry = resultEmpty.data[resultEmpty.data.length - 1];

    const dateFrom = firstEntry.sent_at ?? null;
    const dateTo = lastEntry.sent_at ?? null;

    if (dateFrom !== null && dateTo !== null) {
      const searchRequestDateRange = {
        sent_at_from: dateFrom,
        sent_at_to: dateTo,
        page: 0,
        limit: 5,
      } satisfies IEnterpriseLmsNotificationLog.IRequest;

      const resultDateRange: IPageIEnterpriseLmsNotificationLog.ISummary =
        await api.functional.enterpriseLms.systemAdmin.notificationLogs.search(
          connection,
          {
            body: searchRequestDateRange,
          },
        );
      typia.assert(resultDateRange);

      for (const log of resultDateRange.data) {
        if (log.sent_at !== null && log.sent_at !== undefined) {
          TestValidator.predicate(
            "sent_at within range",
            log.sent_at >= dateFrom && log.sent_at <= dateTo,
          );
        }
      }

      TestValidator.predicate(
        "pagination limit respected for date range",
        resultDateRange.pagination.limit === 5,
      );
      TestValidator.equals(
        "pagination current page is correct",
        resultDateRange.pagination.current,
        0,
      );
    }
  }
}
