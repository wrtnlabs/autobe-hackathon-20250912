import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * This test case validates the status update functionality of a Telegram
 * file downloader end user's download job.
 *
 * It follows the complete workflow:
 *
 * 1. Register and authenticate an end user.
 * 2. Create a new download job with realistic filtering parameters.
 * 3. Update the status of the created download job to a different valid
 *    status.
 * 4. Verify the status update is reflected correctly and timestamps are
 *    consistent.
 * 5. Ensure that updating with an invalid status value results in an error.
 * 6. Validate that updating a non-existent job (invalid job ID) triggers an
 *    error.
 *
 * The test ensures strict adherence to DTO constraints, format validation,
 * and uses typia.assert to guarantee type safety. It also verifies error
 * scenarios with proper async error validation.
 *
 * This comprehensive E2E test confirms that the Telegram file downloader
 * end user API's status update endpoint works correctly and enforces
 * business rules for status changes.
 */
export async function test_api_telegram_file_downloader_end_user_download_jobs_update_status_change(
  connection: api.IConnection,
) {
  // 1. Register an end user with a realistic email and password_hash
  const endUserCreateBody = {
    email: `${RandomGenerator.alphabets(6).toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const endUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: endUserCreateBody,
    });
  typia.assert(endUser);

  // 2. Create a new download job with randomized but valid values
  const downloadJobCreateBody = {
    channel_id: `@${RandomGenerator.alphaNumeric(8)}`,
    file_types: "mp4,zip",
    date_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    date_end: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: downloadJobCreateBody,
      },
    );
  typia.assert(downloadJob);

  // 3. Prepare a valid new status different from current status
  const validNewStatus: string =
    downloadJob.status !== "completed" ? "completed" : "pending";

  // Update download job status
  const downloadJobUpdateBody = {
    status: validNewStatus,
  } satisfies ITelegramFileDownloaderDownloadJob.IUpdate;

  const updatedDownloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.update(
      connection,
      {
        id: downloadJob.id,
        body: downloadJobUpdateBody,
      },
    );
  typia.assert(updatedDownloadJob);

  // 4. Validate updated status and consistency of timestamps
  TestValidator.equals(
    "updated job status matches new status",
    updatedDownloadJob.status,
    validNewStatus,
  );
  TestValidator.predicate(
    "updated_at is >= created_at",
    updatedDownloadJob.updated_at >= updatedDownloadJob.created_at,
  );

  // 5. Error test: update with invalid status value
  await TestValidator.error(
    "update with invalid status value should fail",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.update(
        connection,
        {
          id: downloadJob.id,
          body: {
            status: "invalid_status_value",
          } satisfies ITelegramFileDownloaderDownloadJob.IUpdate,
        },
      );
    },
  );

  // 6. Error test: update with invalid job ID
  await TestValidator.error(
    "update with invalid job ID should fail",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: validNewStatus,
          } satisfies ITelegramFileDownloaderDownloadJob.IUpdate,
        },
      );
    },
  );
}
