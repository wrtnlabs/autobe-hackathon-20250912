import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBackupRecord";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBackupRecord";

/**
 * Test backup records search with pagination, filtering, and authorization.
 *
 * 1. Authenticate as system administrator with systemAdmin role join.
 * 2. Using the authenticated connection, perform backup records search with
 *    empty filter.
 * 3. Perform filtered search by backup type and verify all returned records
 *    have the matching type.
 * 4. Perform filtered search by backup status and verify all records match the
 *    status.
 * 5. Combine pagination with filtering and verify page metadata and data.
 * 6. Test edge case: filter by non-existent backup type, expect zero results.
 * 7. Validate each API response against the expected type structure using
 *    typia.assert.
 */
export async function test_api_backup_records_search_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as system administrator
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Search backup records with empty filter
  const emptyFilter: IEnterpriseLmsBackupRecord.IRequest = {
    page: 1,
    limit: 10,
  };
  const pageAll: IPageIEnterpriseLmsBackupRecord.ISummary =
    await api.functional.enterpriseLms.systemAdmin.backupRecords.index(
      connection,
      {
        body: emptyFilter,
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "pagination current page is 1",
    pageAll.pagination.current === 1,
  );
  TestValidator.predicate(
    "items per page is less or equal to 10",
    pageAll.data.length <= 10,
  );

  // 3. Filter by backup type
  if (pageAll.data.length > 0) {
    const someType = pageAll.data[0].backup_type;
    const filterByType: IEnterpriseLmsBackupRecord.IRequest = {
      filterByType: someType,
      page: 1,
      limit: 5,
    };
    const pageFilteredByType: IPageIEnterpriseLmsBackupRecord.ISummary =
      await api.functional.enterpriseLms.systemAdmin.backupRecords.index(
        connection,
        {
          body: filterByType,
        },
      );
    typia.assert(pageFilteredByType);
    TestValidator.predicate(
      "all records in filtered type have matching backup_type",
      pageFilteredByType.data.every((rec) => rec.backup_type === someType),
    );
  }

  // 4. Filter by backup status
  if (pageAll.data.length > 0) {
    const someStatus = pageAll.data[0].status;
    const filterByStatus: IEnterpriseLmsBackupRecord.IRequest = {
      filterByStatus: someStatus,
      page: 1,
      limit: 5,
    };
    const pageFilteredByStatus: IPageIEnterpriseLmsBackupRecord.ISummary =
      await api.functional.enterpriseLms.systemAdmin.backupRecords.index(
        connection,
        {
          body: filterByStatus,
        },
      );
    typia.assert(pageFilteredByStatus);
    TestValidator.predicate(
      "all records in filtered status have matching status",
      pageFilteredByStatus.data.every((rec) => rec.status === someStatus),
    );
  }

  // 5. Combine pagination and filtering
  if (pageAll.data.length > 0) {
    const filterType = pageAll.data[0].backup_type;
    const requestCombined: IEnterpriseLmsBackupRecord.IRequest = {
      filterByType: filterType,
      page: 2,
      limit: 3,
    };
    const pageCombined: IPageIEnterpriseLmsBackupRecord.ISummary =
      await api.functional.enterpriseLms.systemAdmin.backupRecords.index(
        connection,
        {
          body: requestCombined,
        },
      );
    typia.assert(pageCombined);
    TestValidator.predicate(
      "pagination current page is 2",
      pageCombined.pagination.current === 2,
    );
    TestValidator.predicate(
      "items per page less or equal to 3",
      pageCombined.data.length <= 3,
    );
    TestValidator.predicate(
      "all records in combined filter have the backup type",
      pageCombined.data.every((rec) => rec.backup_type === filterType),
    );
  }

  // 6. Edge case: filter by non-existent backup type
  const nonExistentFilter: IEnterpriseLmsBackupRecord.IRequest = {
    filterByType: "non_existent_backup_type_abc123",
    page: 1,
    limit: 10,
  };
  const pageEmpty: IPageIEnterpriseLmsBackupRecord.ISummary =
    await api.functional.enterpriseLms.systemAdmin.backupRecords.index(
      connection,
      {
        body: nonExistentFilter,
      },
    );
  typia.assert(pageEmpty);
  TestValidator.equals(
    "filtered empty result has zero data length",
    pageEmpty.data.length,
    0,
  );
}
