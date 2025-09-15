import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

export async function test_api_developer_download_job_files_at(
  connection: api.IConnection,
) {
  // 1. Register developer user
  const developerRegistrationBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const registeredDeveloper = await api.functional.auth.developer.join(
    connection,
    {
      body: developerRegistrationBody,
    },
  );
  typia.assert(registeredDeveloper);
  const developerEmail = developerRegistrationBody.email;
  const developerPassword = developerRegistrationBody.password_hash;

  // 2. Login developer user
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loggedDeveloper = await api.functional.auth.developer.login(
    connection,
    {
      body: developerLoginBody,
    },
  );
  typia.assert(loggedDeveloper);

  // 3. Create a new download job
  const downloadJobBody = {
    channel_id: "@ExampleTelegramChannel",
    file_types: "mp4,jpg,pdf",
    date_start: new Date(Date.now() - 86400000 * 30).toISOString(),
    date_end: new Date().toISOString(),
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;
  const downloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: downloadJobBody,
      },
    );
  typia.assert(downloadJob);

  // 4. Create a file entity linked to the download job
  const nowISOString = new Date().toISOString();
  const fileCreateBody = {
    download_job_id: downloadJob.id,
    filename: "example_file.mp4",
    file_extension: "mp4",
    file_size_bytes: 1024,
    s3_url:
      "https://signed-s3-url.example.com/file.mp4?X-Amz-Signature=signature",
    created_at: nowISOString,
    updated_at: nowISOString,
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

  // 5. Retrieve file details using file id and download job id
  const fileDetails =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.at(
      connection,
      {
        downloadJobId: downloadJob.id,
        id: createdFile.id,
      },
    );
  typia.assert(fileDetails);

  // 6. Validate that the returned file details match those of the created file
  TestValidator.equals("file id matches", fileDetails.id, createdFile.id);
  TestValidator.equals(
    "download job id matches",
    fileDetails.download_job_id,
    createdFile.download_job_id,
  );
  TestValidator.equals(
    "filename matches",
    fileDetails.filename,
    fileCreateBody.filename,
  );
  TestValidator.equals(
    "file extension matches",
    fileDetails.file_extension,
    fileCreateBody.file_extension,
  );
  TestValidator.equals(
    "file size matches",
    fileDetails.file_size_bytes,
    fileCreateBody.file_size_bytes,
  );
  TestValidator.equals(
    "s3 url matches",
    fileDetails.s3_url,
    fileCreateBody.s3_url,
  );

  // 7. Negative test: Access without authentication should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.at(
      unauthConn,
      {
        downloadJobId: downloadJob.id,
        id: createdFile.id,
      },
    );
  });

  // 8. Negative test: Access with invalid downloadJobId should fail
  await TestValidator.error("invalid downloadJobId should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.at(
      connection,
      {
        downloadJobId: typia.random<string & tags.Format<"uuid">>(),
        id: createdFile.id,
      },
    );
  });

  // 9. Negative test: Access with invalid file id should fail
  await TestValidator.error("invalid file id should fail", async () => {
    await api.functional.telegramFileDownloader.developer.download_jobs.files.at(
      connection,
      {
        downloadJobId: downloadJob.id,
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 10. Negative test: Access file of another user's download job
  // Create another developer account
  const otherDevRegistrationBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;
  const otherDev = await api.functional.auth.developer.join(connection, {
    body: otherDevRegistrationBody,
  });
  typia.assert(otherDev);

  // Login other developer
  const otherDevLoginBody = {
    email: otherDevRegistrationBody.email,
    password: otherDevRegistrationBody.password_hash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;
  const loggedOtherDev = await api.functional.auth.developer.login(connection, {
    body: otherDevLoginBody,
  });
  typia.assert(loggedOtherDev);

  // Create new download job for other developer
  const otherDownloadJobBody = {
    channel_id: "@OtherTelegramChannel",
  } satisfies ITelegramFileDownloaderDownloadJob.ICreate;
  const otherDownloadJob =
    await api.functional.telegramFileDownloader.developer.download_jobs.create(
      connection,
      {
        body: otherDownloadJobBody,
      },
    );
  typia.assert(otherDownloadJob);

  // Create file linked to other developer's job
  const otherFileCreateBody = {
    download_job_id: otherDownloadJob.id,
    filename: "other_file.mp4",
    file_extension: "mp4",
    file_size_bytes: 2048,
    s3_url:
      "https://signed-s3-url.example.com/other_file.mp4?X-Amz-Signature=othersignature",
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITelegramFileDownloaderFiles.ICreate;
  const otherCreatedFile =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
      connection,
      {
        downloadJobId: otherDownloadJob.id,
        body: otherFileCreateBody,
      },
    );
  typia.assert(otherCreatedFile);

  // Try accessing other developer's file using first developer's connection - should fail
  await TestValidator.error(
    "access to another developer's download job file should fail",
    async () => {
      await api.functional.telegramFileDownloader.developer.download_jobs.files.at(
        connection,
        {
          downloadJobId: otherDownloadJob.id,
          id: otherCreatedFile.id,
        },
      );
    },
  );
}
