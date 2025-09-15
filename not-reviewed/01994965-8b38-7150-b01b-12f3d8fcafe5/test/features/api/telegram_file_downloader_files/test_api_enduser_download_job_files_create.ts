import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * This test validates the workflow of registering and authenticating an end
 * user, creating a Telegram file download job, and attaching a file to that job
 * through the API.
 *
 * It covers:
 *
 * 1. End user account creation with email and hashed password.
 * 2. End user login with the same email and plaintext password.
 * 3. Download job creation for a Telegram channel ID with optional filters.
 * 4. File record creation linked to the download job, including filename, file
 *    extension, file size, and a signed AWS S3 URL.
 * 5. Validation that the created file correctly associates with the download job.
 * 6. Testing unauthorized creation errors by attempting file creation without a
 *    valid authentication context.
 *
 * All API responses are asserted for type safety, proper data formats are used,
 * and all required properties are included. TestValidator functions verify
 * expected relations and error handling.
 */
export async function test_api_enduser_download_job_files_create(
  connection: api.IConnection,
) {
  // 1. End user registration
  const plaintextPassword = RandomGenerator.alphaNumeric(12);
  const passwordHash = plaintextPassword; // Simulated password hash for test

  const endUserAuthorized: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(endUserAuthorized);

  // 2. End user login with plaintext password
  const endUserLoggedIn: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: {
        email: endUserAuthorized.email,
        password: plaintextPassword,
      } satisfies ITelegramFileDownloaderEndUser.ILogin,
    });
  typia.assert(endUserLoggedIn);

  // 3. Create a download job with a Telegram channel ID
  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: {
          channel_id: `channel_${RandomGenerator.alphaNumeric(8)}`,
          file_types: null,
          date_start: null,
          date_end: null,
        } satisfies ITelegramFileDownloaderDownloadJob.ICreate,
      },
    );
  typia.assert(downloadJob);

  // 4. Create a new file record linked to the download job
  const nowIso = new Date().toISOString();
  const fileCreateBody: ITelegramFileDownloaderFiles.ICreate = {
    download_job_id: downloadJob.id,
    filename: `video_${RandomGenerator.alphaNumeric(6)}.mp4`,
    file_extension: "mp4",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    s3_url: `https://s3.amazonaws.com/bucket/${RandomGenerator.alphaNumeric(16)}`,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  const createdFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.endUser.download_jobs.files.create(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: fileCreateBody,
      },
    );
  typia.assert(createdFile);

  // 5. Validate the file is associated to the download job
  TestValidator.equals(
    "File's download_job_id should match the download job id",
    createdFile.download_job_id,
    downloadJob.id,
  );

  // 6. Test error handling: attempt file creation without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated file creation must fail",
    async () => {
      await api.functional.telegramFileDownloader.endUser.download_jobs.files.create(
        unauthConnection,
        {
          downloadJobId: downloadJob.id,
          body: fileCreateBody,
        },
      );
    },
  );
}
