import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLogArchive";

/**
 * Validate that a system administrator can search, filter, and paginate audit
 * log archive records.
 *
 * 1. Register a new system admin (join) with randomly generated credentials.
 * 2. Login as the system admin.
 * 3. Search audit log archives with default (no filter), validate pagination meta.
 * 4. If any results exist, filter by organization_id, archive_type, and file URI
 *    substring, as well as created_at date. Validate that results honor the
 *    relevant filter each time. Test pagination by specifying page and
 *    page_size, verify returned count and pagination values.
 * 5. Use a non-existent organization_id, expect empty result.
 * 6. Trigger a validation error by passing a negative page value, verify error
 *    handling is correct.
 */
export async function test_api_audit_log_archive_search_system_admin(
  connection: api.IConnection,
) {
  // Prepare random credentials
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(10);
  // Register system admin
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadmin);
  // Login as system admin
  const authed = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(authed);

  // Search with no filter (default)
  const defaultPage =
    await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
      connection,
      { body: {} satisfies IHealthcarePlatformAuditLogArchive.IRequest },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "pagination info exists",
    typeof defaultPage.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination info exists",
    typeof defaultPage.pagination.limit,
    "number",
  );

  // If there is at least one result, run further filtered queries
  if (defaultPage.data.length) {
    const randomArchive = RandomGenerator.pick(defaultPage.data);
    const orgId = randomArchive.organization_id;
    const archiveType = randomArchive.archive_type;
    const fileUriSub = randomArchive.archive_file_uri.substring(0, 8);
    // Filter by organization_id
    const filteredByOrg =
      await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            organization_id: orgId,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(filteredByOrg);
    TestValidator.predicate(
      "all results have org_id",
      filteredByOrg.data.every((x) => x.organization_id === orgId),
    );
    // Filter by archive_type
    const byType =
      await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            archive_type: archiveType,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(byType);
    TestValidator.predicate(
      "all results have archive_type",
      byType.data.every((x) => x.archive_type === archiveType),
    );
    // Fulltext search on archive_file_uri
    const fileUriResults =
      await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            archive_file_uri_contains: fileUriSub,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(fileUriResults);
    TestValidator.predicate(
      "all URIs contain substring",
      fileUriResults.data.every((x) => x.archive_file_uri.includes(fileUriSub)),
    );
    // Date range filter (created_at): single record's created_at as both from/to
    const first = defaultPage.data[0];
    const createdFrom = first.created_at;
    const createdTo = first.created_at;
    const byCreated =
      await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            created_at_from: createdFrom,
            created_at_to: createdTo,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(byCreated);
    TestValidator.predicate(
      "dates are in specified range",
      byCreated.data.every(
        (x) => x.created_at >= createdFrom && x.created_at <= createdTo,
      ),
    );
    // Pagination: page 1, page_size 2
    const paged =
      await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
        connection,
        {
          body: {
            page: 1,
            page_size: 2,
          } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
        },
      );
    typia.assert(paged);
    TestValidator.equals("respects page_size", paged.data.length <= 2, true);
    TestValidator.equals(
      "returned page number matches",
      paged.pagination.current,
      1,
    );
  }
  // Non-existent organization_id yields zero results
  const nonePage =
    await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
      },
    );
  typia.assert(nonePage);
  TestValidator.equals(
    "empty if org id is not present",
    nonePage.data.length,
    0,
  );
  // Malformed filter: page negative triggers error
  await TestValidator.error("page negative throws error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.auditLogArchives.index(
      connection,
      {
        body: {
          page: -1,
        } satisfies IHealthcarePlatformAuditLogArchive.IRequest,
      },
    );
  });
}
