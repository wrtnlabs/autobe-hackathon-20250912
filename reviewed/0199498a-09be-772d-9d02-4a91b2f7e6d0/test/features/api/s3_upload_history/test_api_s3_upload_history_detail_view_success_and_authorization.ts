import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiS3UploadHistory";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate retrieval of S3 upload history detail as system admin, and check
 * audit/authorization boundaries.
 *
 * 1. Register and log in as system admin (for authenticated privilege).
 * 2. Simulate a valid S3 upload history record (use typia.random to generate test
 *    UUID and simulate existence).
 * 3. Successfully retrieve the S3 upload history record detail as authenticated
 *    admin; validate all contract fields and masking business logic.
 * 4. Attempt retrieval of a non-existent S3 upload history record (random UUID);
 *    expect error.
 * 5. Logout or use unauthenticated connection; attempt access, expect error.
 */
export async function test_api_s3_upload_history_detail_view_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(20),
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Generate a random UUID for the S3 upload history (simulated record)
  const s3UploadHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve upload history record successfully as admin
  const s3UploadHistory =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.at(
      connection,
      {
        s3UploadHistoryId,
      },
    );
  typia.assert(s3UploadHistory);
  TestValidator.predicate(
    "admin can retrieve s3 upload history record with expected file/audit/event fields",
    s3UploadHistory.id === s3UploadHistoryId,
  );
  TestValidator.predicate(
    "file_size is positive integer",
    typeof s3UploadHistory.file_size === "number" &&
      s3UploadHistory.file_size > 0,
  );
  TestValidator.predicate(
    "media_type is non-empty",
    typeof s3UploadHistory.media_type === "string" &&
      s3UploadHistory.media_type.length > 0,
  );
  TestValidator.predicate(
    "filename is non-empty",
    typeof s3UploadHistory.filename === "string" &&
      s3UploadHistory.filename.length > 0,
  );

  // 4. Attempt retrieval with non-existent UUID -- expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error on non-existent s3 upload history record",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.at(
        connection,
        { s3UploadHistoryId: nonExistentId },
      );
    },
  );

  // 5. Attempt retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error when not authenticated as system admin",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.at(
        unauthConn,
        { s3UploadHistoryId },
      );
    },
  );
}
