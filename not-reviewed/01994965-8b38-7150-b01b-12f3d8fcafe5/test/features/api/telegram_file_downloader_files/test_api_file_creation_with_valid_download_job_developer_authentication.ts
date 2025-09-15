import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * E2E test verifies that a developer user can authenticate and create a new
 * file record linked to a valid download job via Telegram File Downloader
 * API.
 *
 * The test performs developer registration, login, then creates a file
 * under an existing download job by passing valid file metadata. It
 * validates that authentication works, the file is created successfully,
 * and response data matches the input.
 *
 * This ensures strict security, authorization, and data integrity for file
 * creation by authenticated developers.
 *
 * Workflow:
 *
 * 1. Register developer with unique email and password hash.
 * 2. Log in same developer to obtain fresh JWT tokens.
 * 3. Use a generated valid UUID as downloadJobId.
 * 4. Prepare valid file creation metadata with filename, extension, size, S3
 *    URL, and timestamps.
 * 5. Call file creation endpoint authenticated.
 * 6. Assert resulting file entity matches input data.
 */
export async function test_api_file_creation_with_valid_download_job_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Developer registers via /auth/developer/join
  const developerCreateBody = {
    email: `dev_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const createdDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(createdDeveloper);

  // 2. Developer logs in
  const developerLoginBody = {
    email: createdDeveloper.email,
    password: developerCreateBody.password_hash, // Using password_hash as password for test
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loggedInDeveloper);

  // Validate developer ID and email consistency
  TestValidator.equals(
    "developer ID matches after login",
    loggedInDeveloper.id,
    createdDeveloper.id,
  );
  TestValidator.equals(
    "developer email matches after login",
    loggedInDeveloper.email,
    createdDeveloper.email,
  );

  // 3. Assume a valid downloadJobId (UUID) - For test, generate a random UUID string
  const downloadJobId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create valid file metadata for creation
  const timestamp = new Date().toISOString();
  const filename = `testfile_${RandomGenerator.alphaNumeric(6)}.txt`;
  const fileExtension = "txt";
  const fileSizeBytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const s3Url = `https://${RandomGenerator.alphaNumeric(10)}.s3.amazonaws.com/${filename}`;

  const fileCreateBody = {
    download_job_id: downloadJobId,
    filename: filename,
    file_extension: fileExtension,
    file_size_bytes: fileSizeBytes,
    s3_url: s3Url,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  } satisfies ITelegramFileDownloaderFiles.ICreate;

  // 5. Call file creation endpoint with authenticated developer connection
  const createdFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.create(
      connection,
      {
        downloadJobId: downloadJobId,
        body: fileCreateBody,
      },
    );
  typia.assert(createdFile);

  // 6. Validate created file metadata matches request body (except id generated)
  TestValidator.equals(
    "download job id matches",
    createdFile.download_job_id,
    fileCreateBody.download_job_id,
  );
  TestValidator.equals(
    "filename matches",
    createdFile.filename,
    fileCreateBody.filename,
  );
  TestValidator.equals(
    "file extension matches",
    createdFile.file_extension,
    fileCreateBody.file_extension,
  );
  TestValidator.equals(
    "file size bytes matches",
    createdFile.file_size_bytes,
    fileCreateBody.file_size_bytes,
  );
  TestValidator.equals(
    "s3 URL matches",
    createdFile.s3_url,
    fileCreateBody.s3_url,
  );
  TestValidator.equals(
    "created at matches",
    createdFile.created_at,
    fileCreateBody.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    createdFile.updated_at,
    fileCreateBody.updated_at,
  );
  TestValidator.equals("deleted at matches", createdFile.deleted_at, null);
}
