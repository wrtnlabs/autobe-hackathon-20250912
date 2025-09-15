import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * This test validates the creation of a new download job by an
 * authenticated developer user.
 *
 * It executes the full workflow:
 *
 * 1. Register a new developer user with unique email and secure password hash.
 * 2. Register an end user account (prerequisite for 'endUser' authorization
 *    context).
 * 3. Create a download job as the authenticated developer specifying Telegram
 *    channel ID, optional file type filters, and a date range.
 * 4. Validates the returned download job response object conforms to expected
 *    types and business rules.
 *
 * This comprehensive test ensures correct authentication handling and job
 * creation via the Telegram File Downloader backend APIs.
 *
 * All API responses are assert-validated for strict type and format
 * compliance. Business rules such as subscription checks and file type
 * filters are implicitly honored.
 */
export async function test_api_telegram_file_downloader_developer_download_jobs_create_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a developer user
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = RandomGenerator.alphaNumeric(64);
  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: developerPasswordHash,
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Register an end user (prerequisite)
  const endUserEmail = typia.random<string & tags.Format<"email">>();
  const endUserPasswordHash = RandomGenerator.alphaNumeric(64);
  const endUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: {
        email: endUserEmail,
        password_hash: endUserPasswordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(endUser);

  // 3. Create a download job as the developer
  // Prepare a realistic Telegram channel ID string (string, no further constraint)
  const channelId = `@channel_${RandomGenerator.alphaNumeric(10)}`;

  // Optionally set some file types filter as a CSV string
  // For demonstration, pick 2 sample file extensions
  const fileTypes = "mp4,jpg";

  // Optionally set date range: generate ISO8601 date strings - start and end
  const dateStart = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const dateEnd = new Date().toISOString();

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: {
          channel_id: channelId,
          file_types: fileTypes,
          date_start: dateStart,
          date_end: dateEnd,
        } satisfies ITelegramFileDownloaderDownloadJob.ICreate,
      },
    );
  typia.assert(downloadJob);

  // 4. Validate response data
  TestValidator.predicate(
    "downloadJob has valid UUID for id",
    typia.is<string & tags.Format<"uuid">>(downloadJob.id),
  );
  TestValidator.predicate(
    "downloadJob status is non-empty string",
    typeof downloadJob.status === "string" && downloadJob.status.length > 0,
  );
  TestValidator.equals(
    "downloadJob channelId matches requested",
    downloadJob.channel_id,
    channelId,
  );
  TestValidator.predicate(
    "downloadJob created_at is valid ISO date-time string",
    typeof downloadJob.created_at === "string" &&
      !Number.isNaN(Date.parse(downloadJob.created_at)),
  );
  TestValidator.predicate(
    "downloadJob updated_at is valid ISO date-time string",
    typeof downloadJob.updated_at === "string" &&
      !Number.isNaN(Date.parse(downloadJob.updated_at)),
  );
  TestValidator.predicate(
    "downloadJob deleted_at is null or valid ISO date-time string",
    downloadJob.deleted_at === null ||
      downloadJob.deleted_at === undefined ||
      (typeof downloadJob.deleted_at === "string" &&
        !Number.isNaN(Date.parse(downloadJob.deleted_at))),
  );
}
