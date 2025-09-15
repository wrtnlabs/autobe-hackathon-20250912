import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";

/**
 * This E2E test validates the workflow for updating the status of a Telegram
 * File Downloader download job by an authorized developer. The test involves
 * the following steps:
 *
 * 1. Developer registration using the /auth/developer/join endpoint to obtain an
 *    authorized developer user with JWT tokens.
 * 2. Creating a new download job using
 *    /telegramFileDownloader/developer/download-jobs with valid data including
 *    a mandatory channel_id and optional filters.
 * 3. Updating the download job's status field via PUT
 *    /telegramFileDownloader/developer/download-jobs/{id}.
 *
 * The test verifies that the status update is applied correctly and confirmed
 * by the updated job entity in the response, including timestamps and status.
 * It also tests failure cases such as unauthorized access and attempts to
 * update with invalid status values.
 *
 * This test guarantees the business logic for download job status updates
 * functions correctly with proper authorization and data validation.
 */
export async function test_api_telegram_file_downloader_developer_download_jobs_update_status_change(
  connection: api.IConnection,
) {
  // 1. Developer registration for authentication
  const developerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // 2. Create a new download job
  const jobCreateBody = {
    channel_id: "channel_" + RandomGenerator.alphaNumeric(6),
    file_types: null,
    date_start: null,
    date_end: null,
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const job: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: jobCreateBody,
      },
    );
  typia.assert(job);

  // 3. Update the status field of the download job
  const validStatus = "in_progress";
  const updateBody = {
    status: validStatus,
  } satisfies ITelegramFileDownloaderDownloadJob.IUpdate;

  const updatedJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.update(
      connection,
      {
        id: job.id,
        body: updateBody,
      },
    );
  typia.assert(updatedJob);

  // Verify update applied
  TestValidator.equals("job id unchanged", updatedJob.id, job.id);
  TestValidator.equals(
    "status updated correctly",
    updatedJob.status,
    validStatus,
  );
  TestValidator.predicate(
    "updated_at not earlier than created_at",
    new Date(updatedJob.updated_at).getTime() >=
      new Date(job.created_at).getTime(),
  );

  // 4. Try update with unauthorized connection - expected to error
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.update(
      unauthorizedConn,
      {
        id: job.id,
        body: updateBody,
      },
    );
  });

  // 5. Attempt update with invalid status value - expected to error
  const invalidUpdateBody = {
    status: "invalid_status_value",
  } satisfies ITelegramFileDownloaderDownloadJob.IUpdate;

  await TestValidator.error(
    "invalid status value should cause validation error",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.update(
        connection,
        {
          id: job.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
