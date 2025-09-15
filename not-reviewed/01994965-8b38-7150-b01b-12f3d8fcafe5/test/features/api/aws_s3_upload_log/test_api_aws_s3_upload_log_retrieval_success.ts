import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAwsS3UploadLogs";

export async function test_api_aws_s3_upload_log_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = "some-password-hash";
  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Generate a random awsS3UploadLogId for testing
  const awsS3UploadLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the AWS S3 upload log by ID as admin
  const uploadLog: ITelegramFileDownloaderAwsS3UploadLogs =
    await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.at(
      connection,
      { awsS3UploadLogId },
    );
  typia.assert(uploadLog);

  // 4. Validate essential fields existence and consistency with business logic
  TestValidator.predicate(
    "upload log has valid ID",
    typeof uploadLog.id === "string" && uploadLog.id.length > 0,
  );
  TestValidator.predicate(
    "upload log file_name is non-empty string",
    typeof uploadLog.file_name === "string" && uploadLog.file_name.length > 0,
  );
  TestValidator.predicate(
    "upload log file_size_bytes is integer >= 0",
    Number.isInteger(uploadLog.file_size_bytes) &&
      uploadLog.file_size_bytes >= 0,
  );
  TestValidator.predicate(
    "upload log upload_status is non-empty string",
    typeof uploadLog.upload_status === "string" &&
      uploadLog.upload_status.length > 0,
  );
  TestValidator.predicate(
    "upload log attempted_at is valid date string",
    !isNaN(Date.parse(uploadLog.attempted_at)),
  );
  TestValidator.predicate(
    "upload log created_at is valid date string",
    !isNaN(Date.parse(uploadLog.created_at)),
  );
  TestValidator.predicate(
    "upload log updated_at is valid date string",
    !isNaN(Date.parse(uploadLog.updated_at)),
  );

  // 5. Test unauthorized access denied: unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized retrieval fails without login",
    async () => {
      await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.at(
        unauthenticatedConnection,
        { awsS3UploadLogId },
      );
    },
  );

  // 6. Test unauthorized access denied (simulate invalid token by blank headers)
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized retrieval fails for invalid token",
    async () => {
      await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.at(
        invalidTokenConnection,
        { awsS3UploadLogId },
      );
    },
  );

  // 7. Test retrieval of a non-existent awsS3UploadLogId results in error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval fails for non-existent awsS3UploadLogId",
    async () => {
      await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.at(
        connection,
        { awsS3UploadLogId: nonExistentId },
      );
    },
  );
}
