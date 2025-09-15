import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAwsS3UploadLogs";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAwsS3UploadLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAwsS3UploadLogs";

/**
 * Validate the retrieval of AWS S3 upload logs list with administrator
 * authentication.
 *
 * This test performs the following critical steps:
 *
 * 1. Administrator user creation and authentication via
 *    /auth/administrator/join.
 * 2. Use administrator credentials to request a filtered, paginated list of
 *    AWS S3 upload logs using PATCH
 *    /telegramFileDownloader/administrator/awsS3UploadLogs.
 * 3. Provide valid request parameters including pagination, filters by file
 *    name and upload status, date range for attempted uploads, and sorting
 *    options.
 * 4. Validate the response body structure including pagination metadata and
 *    summary list correctness.
 * 5. Confirm that unauthorized access attempts are rejected.
 * 6. Confirm that invalid pagination parameters result in error responses.
 */
export async function test_api_aws_s3_upload_log_list_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Administrator user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const admin: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Request a filtered and paginated list of AWS S3 upload logs
  const filterRequest = {
    page: 1,
    limit: 10,
    file_name: null,
    upload_status: null,
    attempted_at_start: null,
    attempted_at_end: null,
    order_by: "attempted_at",
    order_direction: "desc",
  } satisfies ITelegramFileDownloaderAwsS3UploadLogs.IRequest;

  const pageOfLogs: IPageITelegramFileDownloaderAwsS3UploadLogs.ISummary =
    await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(pageOfLogs);

  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    pageOfLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    pageOfLogs.pagination.limit >= 1 && pageOfLogs.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pageOfLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pageOfLogs.pagination.pages >= 0,
  );

  // 4. Validate each upload log summary
  for (const log of pageOfLogs.data) {
    typia.assert(log);
    TestValidator.predicate(
      "upload log id is UUID formatted string",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.id,
      ),
    );
    TestValidator.predicate(
      "file name is not empty",
      typeof log.file_name === "string" && log.file_name.length > 0,
    );
    TestValidator.predicate(
      "file size bytes is >= 0",
      typeof log.file_size_bytes === "number" && log.file_size_bytes >= 0,
    );
    TestValidator.predicate(
      "upload status is present",
      typeof log.upload_status === "string" && log.upload_status.length > 0,
    );
    TestValidator.predicate(
      "attempted_at is valid date",
      !isNaN(Date.parse(log.attempted_at)),
    );
  }

  // 5. Try to call logs endpoint without authentication - expect failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.index(
      unauthenticatedConnection,
      { body: filterRequest },
    );
  });

  // 6. Try to call logs endpoint with invalid pagination parameters - expect failure
  const invalidRequests = [
    { ...filterRequest, page: 0 },
    { ...filterRequest, limit: 0 },
  ];
  for (const invalidRequest of invalidRequests) {
    await TestValidator.error(
      "invalid pagination parameters should fail",
      async () => {
        await api.functional.telegramFileDownloader.administrator.awsS3UploadLogs.index(
          connection,
          {
            body: invalidRequest,
          },
        );
      },
    );
  }
}
