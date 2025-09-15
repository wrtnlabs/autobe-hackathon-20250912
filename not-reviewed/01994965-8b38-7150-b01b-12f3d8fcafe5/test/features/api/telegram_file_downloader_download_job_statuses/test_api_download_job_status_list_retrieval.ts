import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderDownloadJobStatus";
import type { ITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJobStatus";

/**
 * This test verifies the PATCH endpoint at
 * /telegramFileDownloader/download-job-statuses for retrieving Telegram
 * file downloader download job status codes with pagination and filtering.
 *
 * It performs several validations:
 *
 * 1. Basic retrieval of first page without filters.
 * 2. Ensures expected status codes ('pending', 'in_progress', 'completed',
 *    'failed') are present.
 * 3. Checks pagination metadata correctness.
 * 4. Tests pagination parameters (page and limit).
 * 5. Tests filtering by search term across status_code and description.
 * 6. Tests filtering by explicit status_code.
 * 7. Tests edge case filtering by a non-existent status_code resulting in
 *    empty data.
 * 8. Asserts all API responses for correct structure and types.
 * 9. Uses descriptive TestValidator assertions for clarity.
 *
 * No authentication is required for these requests.
 */
export async function test_api_download_job_status_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Retrieve the first page without filters
  const defaultRequest =
    {} satisfies ITelegramFileDownloaderDownloadJobStatus.IRequest;
  const response1 =
    await api.functional.telegramFileDownloader.download_job_statuses.indexDownloadJobStatuses(
      connection,
      { body: defaultRequest },
    );
  typia.assert(response1);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is at least 1",
    response1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    response1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    response1.pagination.pages >= 1,
  );

  // Check for expected status codes in the data
  const statuses = response1.data.map((row) => row.status_code);
  const expectedStatuses = ["pending", "in_progress", "completed", "failed"];
  for (const code of expectedStatuses) {
    TestValidator.predicate(
      `status_code ${code} included`,
      statuses.includes(code),
    );
  }

  // 2. Test pagination with page=2, limit=2
  const pagedRequest = {
    page: 2,
    limit: 2,
  } satisfies ITelegramFileDownloaderDownloadJobStatus.IRequest;
  const response2 =
    await api.functional.telegramFileDownloader.download_job_statuses.indexDownloadJobStatuses(
      connection,
      { body: pagedRequest },
    );
  typia.assert(response2);
  TestValidator.equals(
    "pagination current page equals 2",
    response2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals 2",
    response2.pagination.limit,
    2,
  );

  // 3. Test filtering by search keyword that matches 'pend'
  const searchRequest = {
    search: "pend",
  } satisfies ITelegramFileDownloaderDownloadJobStatus.IRequest;
  const response3 =
    await api.functional.telegramFileDownloader.download_job_statuses.indexDownloadJobStatuses(
      connection,
      { body: searchRequest },
    );
  typia.assert(response3);
  for (const item of response3.data) {
    TestValidator.predicate(
      "search term included in status_code or description",
      item.status_code.includes("pend") || item.description.includes("pend"),
    );
  }

  // 4. Test filtering by specific status_code 'completed'
  const filterByCodeRequest = {
    status_code: "completed",
  } satisfies ITelegramFileDownloaderDownloadJobStatus.IRequest;
  const response4 =
    await api.functional.telegramFileDownloader.download_job_statuses.indexDownloadJobStatuses(
      connection,
      { body: filterByCodeRequest },
    );
  typia.assert(response4);
  for (const item of response4.data) {
    TestValidator.equals(
      "status_code match 'completed'",
      item.status_code,
      "completed",
    );
  }

  // 5. Edge case: filter by non-existent status_code to get empty results
  const noResultRequest = {
    status_code: "non_existent_status_code",
  } satisfies ITelegramFileDownloaderDownloadJobStatus.IRequest;
  const response5 =
    await api.functional.telegramFileDownloader.download_job_statuses.indexDownloadJobStatuses(
      connection,
      { body: noResultRequest },
    );
  typia.assert(response5);
  TestValidator.equals(
    "empty data for non-existent status_code",
    response5.data.length,
    0,
  );
}
