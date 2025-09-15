import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBackupRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBackupRecords";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test retrieval of a backup record by its unique ID.
 *
 * This test validates the ability of an authenticated systemAdmin user to
 * retrieve detailed backup record information by ID from the Enterprise LMS
 * system.
 *
 * The workflow covers successful retrieval with a valid backup record ID, error
 * handling for non-existent IDs, and access control enforcement ensuring only
 * authorized system admins can access this resource.
 *
 * Steps:
 *
 * 1. Authenticate systemAdmin user
 * 2. Retrieve backup record by valid ID and validate response
 * 3. Attempt retrieval with non-existent ID and expect 404 error
 * 4. Attempt to access the endpoint without authentication and expect unauthorized
 *    error
 */
export async function test_api_backup_record_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: systemAdmin user authentication
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(32);
  const systemAdminCreateBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // Step 2: Retrieve backup record by valid ID
  const validBackupRecordId = typia.random<string & tags.Format<"uuid">>();
  const backupRecord: IEnterpriseLmsBackupRecords =
    await api.functional.enterpriseLms.systemAdmin.backupRecords.at(
      connection,
      {
        id: validBackupRecordId,
      },
    );
  typia.assert(backupRecord);

  TestValidator.predicate(
    "backup record ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      backupRecord.id,
    ),
  );

  // Step 3: Attempt to retrieve non-existent backup record and expect 404
  const nonExistentBackupRecordId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent backup record retrieval returns error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.backupRecords.at(
        connection,
        {
          id: nonExistentBackupRecordId,
        },
      );
    },
  );

  // Step 4: Test unauthorized access
  // Create connection without auth token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to backup record retrieval fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.backupRecords.at(
        unauthenticatedConnection,
        {
          id: validBackupRecordId,
        },
      );
    },
  );
}
