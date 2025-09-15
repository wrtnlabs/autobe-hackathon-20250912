import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderBillingLog";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderBillingLog";

/**
 * Validate administrative billing log listing with filtering and
 * pagination.
 *
 * This test registers an administrator, logs in, then performs various
 * queries on the billing logs resource with accurate filtering, pagination,
 * and authorization.
 *
 * Business steps:
 *
 * 1. Create administrator user by joining with random email and password hash.
 * 2. Login administrator user with same credentials.
 * 3. Query billing logs with valid filters including payment ID, event type,
 *    time range, page and limit.
 * 4. Validate that results contain expected pagination details and billing
 *    logs consistent with filters.
 * 5. Query with non-existent payment ID and validate empty response handled
 *    properly.
 * 6. Attempt querying billing logs without valid JWT authorization token and
 *    expect a failure.
 */
export async function test_api_billing_log_list_and_filter_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator account creation
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);

  const adminCreated: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(adminCreated);

  // Step 2: Administrator login
  const adminLoggedIn: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ILogin,
    });
  typia.assert(adminLoggedIn);

  // Step 3: Query billing logs with valid filters
  const validFilterBody: ITelegramFileDownloaderBillingLog.IRequest = {
    telegram_file_downloader_payment_id: adminCreated.id,
    event_type: "payment_success",
    event_timestamp_start: new Date(
      new Date().getTime() - 7 * 24 * 3600 * 1000,
    ).toISOString(),
    event_timestamp_end: new Date().toISOString(),
    page: 1,
    limit: 10,
    sort_by: "event_timestamp",
    sort_order: "desc",
  };
  const paginatedLogs: IPageITelegramFileDownloaderBillingLog =
    await api.functional.telegramFileDownloader.administrator.billingLogs.index(
      connection,
      { body: validFilterBody },
    );
  typia.assert(paginatedLogs);

  TestValidator.predicate(
    "pagination current page is correct",
    paginatedLogs.pagination.current === validFilterBody.page,
  );

  TestValidator.predicate(
    "pagination page limit is correct",
    paginatedLogs.pagination.limit === validFilterBody.limit,
  );

  TestValidator.predicate(
    "all returned logs match payment id filter",
    paginatedLogs.data.every(
      (log) =>
        log.telegram_file_downloader_payment_id ===
        validFilterBody.telegram_file_downloader_payment_id,
    ),
  );

  TestValidator.predicate(
    "all returned logs match event type filter",
    paginatedLogs.data.every(
      (log) => log.event_type === validFilterBody.event_type,
    ),
  );

  // Step 4: Query billing logs with non-existent payment ID
  const nonExistentPaymentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult: IPageITelegramFileDownloaderBillingLog =
    await api.functional.telegramFileDownloader.administrator.billingLogs.index(
      connection,
      {
        body: {
          telegram_file_downloader_payment_id: nonExistentPaymentId,
          page: 1,
          limit: 10,
        } satisfies ITelegramFileDownloaderBillingLog.IRequest,
      },
    );
  typia.assert(emptyResult);

  TestValidator.equals(
    "empty data for non-existent payment ID",
    emptyResult.data.length,
    0,
  );

  // Step 5: Attempt unauthorized request
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized request should fail", async () => {
    await api.functional.telegramFileDownloader.administrator.billingLogs.index(
      unauthorizedConnection,
      { body: validFilterBody },
    );
  });
}
