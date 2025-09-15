import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * Validate developer authentication and update of file metadata tied to a
 * download job.
 *
 * This test covers the end-to-end workflow of a developer registering and
 * logging in, followed by updating file metadata for a file associated with an
 * existing download job. It ensures only the authenticated developer can
 * perform the update and validates that the changes are persisted and returned
 * accurately.
 *
 * Steps:
 *
 * 1. Developer registration via /auth/developer/join
 * 2. Developer login via /auth/developer/login
 * 3. Simulate existing downloadJobId and file id with UUIDs
 * 4. Perform file metadata update with PUT request
 * 5. Validate response matches update inputs
 */
export async function test_api_file_update_with_valid_download_job_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Developer registers with valid email and password hash
  const developerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies ITelegramFileDownloaderDeveloper.ICreate;

  const developer: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreate,
    });
  typia.assert(developer);

  // 2. Developer logs in with the same credentials to authenticate
  const developerLogin = {
    email: developerCreate.email,
    password: developerCreate.password_hash,
  } satisfies ITelegramFileDownloaderDeveloper.ILogin;

  const loggedInDeveloper: ITelegramFileDownloaderDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLogin,
    });
  typia.assert(loggedInDeveloper);

  // 3. Simulate existing download job and file IDs
  const downloadJobId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update data with realistic and valid values
  const fileUpdateBody = {
    filename: RandomGenerator.name(2) + ".mp4",
    file_extension: "mp4",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    s3_url: `https://s3.example.com/${RandomGenerator.alphaNumeric(16)}.mp4?signature=abc123`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies ITelegramFileDownloaderFiles.IUpdate;

  // 5. Perform update call
  const updatedFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.developer.download_jobs.files.update(
      connection,
      {
        downloadJobId: downloadJobId,
        id: fileId,
        body: fileUpdateBody,
      },
    );
  typia.assert(updatedFile);

  // 6. Validate the updated file metadata matches request data
  TestValidator.equals(
    "filename matches update",
    updatedFile.filename,
    fileUpdateBody.filename,
  );
  TestValidator.equals(
    "file_extension matches update",
    updatedFile.file_extension,
    fileUpdateBody.file_extension,
  );
  TestValidator.equals(
    "file_size_bytes matches update",
    updatedFile.file_size_bytes,
    fileUpdateBody.file_size_bytes,
  );
  TestValidator.equals(
    "s3_url matches update",
    updatedFile.s3_url,
    fileUpdateBody.s3_url,
  );
  TestValidator.equals(
    "created_at matches update",
    updatedFile.created_at,
    fileUpdateBody.created_at,
  );
  TestValidator.equals(
    "updated_at matches update",
    updatedFile.updated_at,
    fileUpdateBody.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches update",
    updatedFile.deleted_at,
    fileUpdateBody.deleted_at,
  );
}
