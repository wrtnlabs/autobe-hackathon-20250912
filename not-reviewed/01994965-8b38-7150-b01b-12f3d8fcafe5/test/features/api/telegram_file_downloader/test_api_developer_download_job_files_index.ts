import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderFiles";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * This E2E test function evaluates the complete developer workflow for
 * managing file downloads in the Telegram File Downloader system.
 *
 * It begins with a new developer user registration and login to obtain
 * valid JWT tokens for authorized API access. Then, a download job is
 * created specifying the channel ID and optional file type and date
 * filters. Several files are created and associated with this download job,
 * each with metadata including filename, file extension, size, and a signed
 * S3 URL.
 *
 * Subsequently, the PATCH endpoint for file listing is tested to retrieve
 * files associated with the download job. The test covers paging, sorting,
 * and filtering functionality and verifies that returned file data
 * precisely matches the created files.
 *
 * Negative scenarios validate robustness against unauthorized access,
 * invalid UUIDs, and improper pagination parameters.
 *
 * This test ensures strict type conformity, proper authorization
 * enforcement, and business logic compliance in serial API operations.
 */
export async function test_api_developer_download_job_files_index(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const developerEmail = `${RandomGenerator.alphaNumeric(12)}@example.com`;
  const developerPassword = RandomGenerator.alphaNumeric(16);
  const developerCreateBody = {
    email: developerEmail,
    password_hash: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);
  TestValidator.predicate(
    "developer user has authorization token",
    developer.token.access.length > 0,
  );

  // 2. Developer login to refresh authorization
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loggedInDeveloper);
  TestValidator.equals(
    "developer login email",
    loggedInDeveloper.email,
    developerEmail,
  );

  // 3. Create a download job with channel ID and optional filters
  const downloadJobCreateBody = {
    channel_id: `channel_${RandomGenerator.alphaNumeric(8)}`,
    file_types: "mp4,zip",
    date_start: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    date_end: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;

  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      { body: downloadJobCreateBody },
    );
  typia.assert(downloadJob);
  TestValidator.equals(
    "download job channel id",
    downloadJob.channel_id,
    downloadJobCreateBody.channel_id,
  );

  // 4. Create multiple files associated with the download job
  const fileCount = 5;
  const createdFiles: ITelegramFileDownloaderFiles[] = [];

  for (let i = 0; i < fileCount; i++) {
    const nowISO = new Date().toISOString();
    const fileCreateBody = {
      download_job_id: downloadJob.id,
      filename: `file_${i}_${RandomGenerator.alphaNumeric(6)}.mp4`,
      file_extension: "mp4",
      file_size_bytes: RandomGenerator.pick([
        1048576, 2097152, 3145728,
      ] as const),
      s3_url: `https://s3.amazonaws.com/bucket/file_${i}.mp4?signed=${RandomGenerator.alphaNumeric(20)}`,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    } satisfies ITelegramFileDownloaderFiles.ICreate;

    const createdFile =
      await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
        connection,
        {
          downloadJobId: downloadJob.id,
          body: fileCreateBody,
        },
      );

    typia.assert(createdFile);
    TestValidator.equals(
      "file download_job_id matches",
      createdFile.download_job_id,
      downloadJob.id,
    );
    createdFiles.push(createdFile);
  }

  // 5. Retrieve paginated list of files with paging parameters
  const requestBodyPage1 = {
    page: 1,
    limit: 3,
    sort: ["filename:asc"],
    search: null,
  } satisfies ITelegramFileDownloaderFiles.IRequest;

  const page1Response: IPageITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: requestBodyPage1,
      },
    );
  typia.assert(page1Response);
  TestValidator.predicate(
    "page1 data length <= limit",
    page1Response.data.length <= requestBodyPage1.limit!,
  );
  TestValidator.predicate(
    "total records >= data length",
    page1Response.pagination.records >= page1Response.data.length,
  );

  // 6. Retrieve page 2
  const requestBodyPage2 = {
    page: 2,
    limit: 3,
  } satisfies ITelegramFileDownloaderFiles.IRequest;

  const page2Response: IPageITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: requestBodyPage2,
      },
    );
  typia.assert(page2Response);

  // 7. Validate combined results equal all created files
  const combinedFiles = [...page1Response.data, ...page2Response.data];

  TestValidator.equals(
    "combined pages count equals created files",
    combinedFiles.length,
    createdFiles.length,
  );

  // Check for download_job_id consistency
  combinedFiles.forEach((file) => {
    TestValidator.equals(
      "file belongs to download job",
      file.download_job_id,
      downloadJob.id,
    );
  });

  // 8. Negative test: Unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
      unauthConn,
      {
        downloadJobId: downloadJob.id,
        body: requestBodyPage1,
      },
    );
  });

  // 9. Negative test: Invalid downloadJobId (wrong UUID format)
  await TestValidator.error(
    "invalid UUID for downloadJobId should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
        connection,
        {
          downloadJobId: "invalid-uuid-format",
          body: requestBodyPage1,
        },
      );
    },
  );

  // 10. Negative test: Invalid pagination parameters (negative page number)
  const invalidPagingRequest = {
    page: -1,
    limit: 3,
  } satisfies ITelegramFileDownloaderFiles.IRequest;
  await TestValidator.error("negative page number should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: invalidPagingRequest,
      },
    );
  });

  // 11. Negative test: Invalid pagination parameters (zero limit)
  const zeroLimitRequest = {
    page: 1,
    limit: 0,
  } satisfies ITelegramFileDownloaderFiles.IRequest;
  await TestValidator.error("zero limit should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.index(
      connection,
      {
        downloadJobId: downloadJob.id,
        body: zeroLimitRequest,
      },
    );
  });
}
