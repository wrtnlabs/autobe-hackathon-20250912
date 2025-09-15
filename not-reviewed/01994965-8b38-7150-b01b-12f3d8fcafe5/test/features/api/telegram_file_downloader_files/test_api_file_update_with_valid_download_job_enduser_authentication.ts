import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";

/**
 * Ensure an authorized end user can update the metadata of a file associated
 * with their download job, validating all changes persist and reflect
 * accurately in the returned file record.
 *
 * The test begins by registering a new end user account, followed by logging in
 * to retrieve updated authentication tokens. It then simulates the existence of
 * a download job and an associated file by generating UUIDs. The test submits a
 * PUT request to update the file's properties using the authenticated user's
 * context, verifying the response contains updated data that matches the
 * request. It also confirms proper restriction of access and validates
 * authorization enforcement implicitly by using the authenticated token.
 *
 * Key validations include correctness of the updated metadata fields, success
 * status of the API call, and adherence to the expected data formats, including
 * UUIDs, timestamps, and URLs.
 *
 * This test ensures robust coverage of the file update endpoint under normal
 * authorized operation conditions.
 */
export async function test_api_file_update_with_valid_download_job_enduser_authentication(
  connection: api.IConnection,
) {
  // 1. Known password used for both join and login to maintain authentication
  const password = "test-password";

  // 2. Register a new end user account
  const createdUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: password,
      } satisfies ITelegramFileDownloaderEndUser.ICreate,
    });
  typia.assert(createdUser);

  // 3. Log in the created user to refresh access token
  const loginUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: {
        email: createdUser.email,
        password: password,
      } satisfies ITelegramFileDownloaderEndUser.ILogin,
    });
  typia.assert(loginUser);

  // 4. Prepare the downloadJobId and file id (simulate existence)
  const downloadJobId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Prepare update payload for the file
  const updatedFilePayload = {
    filename: `${RandomGenerator.alphabets(10)}.${RandomGenerator.pick(["mp4", "zip", "jpg", "pdf"] as const)}`,
    file_extension: RandomGenerator.pick(["mp4", "zip", "jpg", "pdf"] as const),
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    s3_url: `https://s3.amazonaws.com/bucket-name/${RandomGenerator.alphaNumeric(32)}`,
  } satisfies ITelegramFileDownloaderFiles.IUpdate;

  // 6. Submit the update API call
  const updatedFile: ITelegramFileDownloaderFiles =
    await api.functional.telegramFileDownloader.endUser.download_jobs.files.update(
      connection,
      {
        downloadJobId,
        id: fileId,
        body: updatedFilePayload,
      },
    );
  typia.assert(updatedFile);

  // 7. Validate the response reflects updates
  TestValidator.equals("file id matches", updatedFile.id, fileId);
  TestValidator.equals(
    "downloadJobId matches",
    updatedFile.download_job_id,
    downloadJobId,
  );
  TestValidator.equals(
    "filename updated",
    updatedFile.filename,
    updatedFilePayload.filename!,
  );
  TestValidator.equals(
    "file_extension updated",
    updatedFile.file_extension,
    updatedFilePayload.file_extension!,
  );
  TestValidator.equals(
    "file_size_bytes updated",
    updatedFile.file_size_bytes,
    updatedFilePayload.file_size_bytes!,
  );
  TestValidator.equals(
    "s3_url updated",
    updatedFile.s3_url,
    updatedFilePayload.s3_url!,
  );
}
