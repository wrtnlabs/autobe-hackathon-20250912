import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderTransactions";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderTransactions";

export async function test_api_transaction_list_pagination_and_filtering_for_administrators(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare filter and pagination parameters
  const userIdFilter = typia.random<string & tags.Format<"uuid">>();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const body: ITelegramFileDownloaderTransactions.IRequest = {
    page: 1,
    limit: 10,
    user_id: userIdFilter,
    date_start: yesterday.toISOString(),
    date_end: now.toISOString(),
  };

  // 3. Call transaction index API with filters
  const response: IPageITelegramFileDownloaderTransactions =
    await api.functional.telegramFileDownloader.administrator.transactions.indexTransactions(
      connection,
      { body },
    );
  typia.assert(response);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current must be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages must be >= 1",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    response.pagination.records >= 0,
  );

  // 5. Validate each transaction record matches filters
  for (const transaction of response.data) {
    typia.assert(transaction);
    // user_id should match filter
    TestValidator.equals(
      "transaction user_id matches filter",
      transaction.user_id,
      userIdFilter,
    );
    // transaction_date be within date range inclusive
    const txDate = new Date(transaction.transaction_date);
    TestValidator.predicate(
      "transaction date is >= date_start",
      txDate >= yesterday,
    );
    TestValidator.predicate("transaction date is <= date_end", txDate <= now);
  }

  // 6. Verify unauthorized user access is rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to transaction index should fail",
    async () => {
      await api.functional.telegramFileDownloader.administrator.transactions.indexTransactions(
        unauthenticatedConnection,
        { body },
      );
    },
  );
}
