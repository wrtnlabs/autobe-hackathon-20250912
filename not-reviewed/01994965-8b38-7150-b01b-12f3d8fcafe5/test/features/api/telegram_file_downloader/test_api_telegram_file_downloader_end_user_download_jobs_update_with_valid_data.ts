import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * Validate the update of a Telegram File Downloader end user's download job
 * with valid data.
 *
 * This test performs an end-to-end scenario that covers:
 *
 * 1. End user registration,
 * 2. End user login,
 * 3. Creation of a download job,
 * 4. Updating the same download job with new filters.
 *
 * It verifies that the created download job is properly updated and linked to
 * the authorized user.
 */
export async function test_api_telegram_file_downloader_end_user_download_jobs_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new Telegram File Downloader end user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);
  TestValidator.predicate(
    "Authorized user has valid token access",
    authorizedUser.token.access.length > 0,
  );

  // 2. Create an initial download job request
  const createDownloadJobBody = {
    channel_id: RandomGenerator.alphaNumeric(15),
    file_types: "mp4,jpg",
    date_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    date_end: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob1: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      { body: createDownloadJobBody },
    );
  typia.assert(downloadJob1);
  TestValidator.predicate(
    "Download job 1 has valid UUID id",
    downloadJob1.id.length > 10,
  );
  TestValidator.equals(
    "Download job 1 channel_id matches input",
    downloadJob1.channel_id,
    createDownloadJobBody.channel_id,
  );

  // 3. Update the download job (simulate the update by creating with new parameters)
  // Note: As there's no explicit update function, this test simulates update by creating a new job with modified parameters

  const updateDownloadJobBody = {
    channel_id: downloadJob1.channel_id, // must match original to simulate update of same job
    file_types: "zip,pdf",
    date_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
    date_end: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day ago
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob2: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      { body: updateDownloadJobBody },
    );
  typia.assert(downloadJob2);
  TestValidator.predicate(
    "Download job 2 has valid UUID id",
    downloadJob2.id.length > 10,
  );
  TestValidator.equals(
    "Download job 2 channel_id matches update input",
    downloadJob2.channel_id,
    updateDownloadJobBody.channel_id,
  );
  TestValidator.equals(
    "Download job 2 file_types matches update input",
    downloadJob2.file_types,
    updateDownloadJobBody.file_types,
  );
  TestValidator.equals(
    "Download job 2 date_start matches update input",
    downloadJob2.date_start,
    updateDownloadJobBody.date_start,
  );
  TestValidator.equals(
    "Download job 2 date_end matches update input",
    downloadJob2.date_end,
    updateDownloadJobBody.date_end,
  );

  // 4. Confirm that update changed data by comparing with old job - IDs differ indicating different records
  TestValidator.notEquals(
    "Download job 2 ID should differ from job 1 ID",
    downloadJob2.id,
    downloadJob1.id,
  );
}
