import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

export async function test_api_enduser_download_job_files_at(
  connection: api.IConnection,
) {
  // 1. Register and join a new end user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinUser: ITelegramFileDownloaderEndUser.ICreate = {
    email: email,
    password_hash: password,
  };
  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: joinUser,
    });
  typia.assert(authorizedUser);

  // 2. Login the same user
  const loginUser: ITelegramFileDownloaderEndUser.ILogin = {
    email: email,
    password: password,
  };
  const loggedInUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: loginUser,
    });
  typia.assert(loggedInUser);

  // 3. Create a new download job with valid channel_id
  // Use a realistic channel id string
  const channelId = "@test_channel_" + RandomGenerator.alphaNumeric(6);
  const downloadJobCreateBody: ITelegramFileDownloaderDownloadJob.ICreate = {
    channel_id: channelId,
  };
  const downloadJob: ITelegramFileDownloaderDownloadJob =
    await api.functional.telegramFileDownloader.endUser.download_jobs.create(
      connection,
      {
        body: downloadJobCreateBody,
      },
    );
  typia.assert(downloadJob);

  // 4. Create a file record associated with the download job
  const fileName = `file_${RandomGenerator.alphaNumeric(6)}.jpg`;
  const fileExtension = "jpg";
  const fileSizeBytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const nowIso8601 = new Date().toISOString();
  const s3Url = `https://s3.amazonaws.com/bucketname/${fileName}?signed=mocktoken`;
  const fileCreateBody: ITelegramFileDownloaderFiles.ICreate = {
    download_job_id: downloadJob.id,
    filename: fileName,
    file_extension: fileExtension,
    file_size_bytes: fileSizeBytes,
    s3_url: s3Url,
    created_at: nowIso8601,
    updated_at: nowIso8601,
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

  TestValidator.equals(
    "created file download_job_id",
    createdFile.download_job_id,
    downloadJob.id,
  );
  TestValidator.equals("created file filename", createdFile.filename, fileName);
  TestValidator.equals(
    "created file file_extension",
    createdFile.file_extension,
    fileExtension,
  );
  TestValidator.equals(
    "created file file_size_bytes",
    createdFile.file_size_bytes,
    fileSizeBytes,
  );
  TestValidator.equals("created file s3_url", createdFile.s3_url, s3Url);
  TestValidator.equals(
    "created file created_at",
    createdFile.created_at,
    nowIso8601,
  );
  TestValidator.equals(
    "created file updated_at",
    createdFile.updated_at,
    nowIso8601,
  );
  TestValidator.equals("created file deleted_at", createdFile.deleted_at, null);

  // 5. Retrieve the same file info with file id and downloadJobId
  const retrievedFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.endUser.download_jobs.files.at(
      connection,
      {
        downloadJobId: downloadJob.id,
        id: createdFile.id,
      },
    );
  typia.assert(retrievedFile);

  TestValidator.equals("retrieved file id", retrievedFile.id, createdFile.id);
  TestValidator.equals(
    "retrieved file download_job_id",
    retrievedFile.download_job_id,
    createdFile.download_job_id,
  );
  TestValidator.equals(
    "retrieved file filename",
    retrievedFile.filename,
    createdFile.filename,
  );
  TestValidator.equals(
    "retrieved file file_extension",
    retrievedFile.file_extension,
    createdFile.file_extension,
  );
  TestValidator.equals(
    "retrieved file file_size_bytes",
    retrievedFile.file_size_bytes,
    createdFile.file_size_bytes,
  );
  TestValidator.equals(
    "retrieved file s3_url",
    retrievedFile.s3_url,
    createdFile.s3_url,
  );
  TestValidator.equals(
    "retrieved file created_at",
    retrievedFile.created_at,
    createdFile.created_at,
  );
  TestValidator.equals(
    "retrieved file updated_at",
    retrievedFile.updated_at,
    createdFile.updated_at,
  );
  TestValidator.equals(
    "retrieved file deleted_at",
    retrievedFile.deleted_at,
    createdFile.deleted_at,
  );
}
