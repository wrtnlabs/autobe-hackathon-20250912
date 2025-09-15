import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * This E2E test function validates the full flow of developer user
 * registration, login, creating a Telegram download job, and creating a
 * linked file record with valid metadata. It also tests failure cases such
 * as invalid download job ID and unauthorized attempts.
 *
 * The test ensures secure authenticated API usage and data integrity by
 * asserting types with typia and all API responses.
 *
 * Steps:
 *
 * 1. Register new developer user and assert authorization token is set
 * 2. Log in as the developer user and assert token is refreshed
 * 3. Create a new Telegram download job with valid parameters
 * 4. Create a file record linked to the download job with valid file data
 * 5. Assert linkage and all file properties match expected constraints
 * 6. Test error on invalid download job ID when creating file
 * 7. Test error on unauthorized access when creating file
 */
export async function test_api_developer_download_job_files_create(
  connection: api.IConnection,
) {
  // 1. Register developer user with unique email and password hash
  const developerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const developerPasswordHash = RandomGenerator.alphaNumeric(16);
  const joinedDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: developerPasswordHash,
      } satisfies ITelegramFileDownloaderDeveloper.ICreate,
    });
  typia.assert(joinedDeveloper);

  // 2. Log in as the developer user to refresh token
  const loginAuthorized: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPasswordHash,
      } satisfies ITelegramFileDownloaderDeveloper.ILogin,
    });
  typia.assert(loginAuthorized);

  // 3. Create a new download job with realistic parameters
  const downloadJobRequest = {
    channel_id: `channel_${RandomGenerator.alphaNumeric(6)}`,
    file_types: "mp4,jpg,pdf",
    date_start: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
    date_end: new Date(Date.now()).toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: downloadJobRequest,
      },
    );
  typia.assert(downloadJob);

  // 4. Create a file record linked to the download job with valid metadata
  const nowISO = new Date().toISOString();
  const fileCreateRequest = {
    download_job_id: downloadJob.id,
    filename: `file_${RandomGenerator.alphaNumeric(5)}.mp4`,
    file_extension: "mp4",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    s3_url: `https://s3.amazonaws.com/mybucket/file_${RandomGenerator.alphaNumeric(10)}.mp4?signature=abc123`,
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
  } satisfies ITelegramFileDownloaderFiles.ICreate;

  const createdFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: fileCreateRequest,
      },
    );
  typia.assert(createdFile);

  // 5. Validate the created file record matches the expected properties
  TestValidator.equals(
    "file linked to correct download job",
    createdFile.download_job_id,
    downloadJob.id,
  );
  TestValidator.equals(
    "filename matches",
    createdFile.filename,
    fileCreateRequest.filename,
  );
  TestValidator.equals(
    "file extension matches",
    createdFile.file_extension,
    fileCreateRequest.file_extension,
  );
  TestValidator.predicate(
    "file size is positive",
    createdFile.file_size_bytes > 0,
  );
  TestValidator.equals(
    "S3 URL matches",
    createdFile.s3_url,
    fileCreateRequest.s3_url,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    createdFile.created_at,
    nowISO,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    createdFile.updated_at,
    nowISO,
  );

  // 6. Attempt to create a file with invalid downloadJobId; expect error
  await TestValidator.error("error on invalid downloadJobId", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
      connection,
      {
        downloadJobId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ...fileCreateRequest,
          download_job_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITelegramFileDownloaderFiles.ICreate,
      },
    );
  });

  // 7. Attempt unauthenticated file creation; expect unauthorized error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
      unauthConn,
      {
        downloadJobId: downloadJob.id,
        body: fileCreateRequest,
      },
    );
  });
}
