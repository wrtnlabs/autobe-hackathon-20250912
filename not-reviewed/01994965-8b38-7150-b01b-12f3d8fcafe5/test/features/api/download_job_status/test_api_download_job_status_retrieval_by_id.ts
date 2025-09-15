import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJobStatus";

/**
 * This test function validates the retrieval of a download job status
 * record by its unique identifier. It ensures that a valid status ID
 * returns proper status details including status code and description. It
 * also verifies that requesting a status with an invalid or non-existent
 * UUID results in an error.
 *
 * The endpoint is publicly accessible with no authentication.
 *
 * The test proceeds as follows:
 *
 * 1. Generate a valid UUID and call the API to retrieve the corresponding
 *    download job status.
 * 2. Assert the returned data matches ITelegramFileDownloaderDownloadJobStatus
 *    structure with correct types.
 * 3. Attempt to retrieve with a random (likely non-existent) UUID and expect
 *    an error.
 */
export async function test_api_download_job_status_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Generate a valid UUID and retrieve the download job status
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const status: ITelegramFileDownloaderDownloadJobStatus =
    await api.functional.telegramFileDownloader.download_job_statuses.atDownloadJobStatus(
      connection,
      { id: validId },
    );
  typia.assert(status);

  // 2. Validate correct structure and field types
  TestValidator.predicate(
    "valid download job status has valid UUID id",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      status.id,
    ),
  );
  TestValidator.predicate(
    "status_code is a non-empty string",
    typeof status.status_code === "string" && status.status_code.length > 0,
  );
  TestValidator.predicate(
    "description is a non-empty string",
    typeof status.description === "string" && status.description.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      status.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      status.updated_at,
    ),
  );

  // 3. Attempt to retrieve with a random UUID that likely does not exist
  const randomNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("should fail with non-existent UUID", async () => {
    await api.functional.telegramFileDownloader.download_job_statuses.atDownloadJobStatus(
      connection,
      { id: randomNonExistentId },
    );
  });
}
