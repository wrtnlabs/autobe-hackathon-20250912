import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate retrieval of a specific locale setting record as a system admin.
 *
 * - Ensures only authenticated admins can access config.
 * - Handles successful fetch, unauthorized/no-auth, forbidden/no privilege, and
 *   missing record cases.
 *
 * 1. Create and authenticate a system admin, then create a locale setting.
 * 2. Retrieve the locale setting by ID with correct admin context; assert full
 *    record is returned and matches creation.
 * 3. Try retrieving without authentication (fresh connection, no token); expect
 *    permission error.
 * 4. Join another admin but do NOT re-authenticate (let token be implicit or
 *    reset); try access as this different user (should fail if strict
 *    admin-per-record binding enforced).
 * 5. Retrieve using a random UUID that does not exist (expect not-found error).
 */
export async function test_api_locale_setting_systemadmin_retrieve(
  connection: api.IConnection,
) {
  // System admin signup and authentication.
  const adminJoinBody = {
    email: `systemadmin.${RandomGenerator.alphaNumeric(6)}@enterprise.com`,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: "admin_pass_!123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Create locale setting for a test org context.
  const localeCreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    healthcare_platform_department_id: null,
    language: RandomGenerator.pick(["en-US", "ko-KR", "es-ES"] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/Berlin",
    ] as const),
    date_format: RandomGenerator.pick([
      "YYYY-MM-DD",
      "MM/DD/YYYY",
      "DD.MM.YYYY",
    ] as const),
    time_format: RandomGenerator.pick(["24h", "12h"] as const),
    number_format: RandomGenerator.pick(["1,234.56", "1.234,56"] as const),
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const created: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      { body: localeCreate },
    );
  typia.assert(created);

  // Retrieve with system admin privileges
  const retrieved =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.at(
      connection,
      { localeSettingId: created.id },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved locale record matches created",
    retrieved,
    created,
  );

  // Attempt retrieval with no authentication context
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized request for locale setting should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.at(
        unauthConn,
        { localeSettingId: created.id },
      );
    },
  );

  // New admin join but don't explicitly login (simulate token swap if applicable)
  const altAdminBody = {
    email: `admin2.${RandomGenerator.alphaNumeric(5)}@corp.com`,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: "altadmin_pass_!123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  await api.functional.auth.systemAdmin.join(connection, {
    body: altAdminBody,
  });
  // Try to access the previous locale as this new admin context
  await TestValidator.error(
    "different admin (not creator) should not access another's locale setting if RBAC is enforced",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.at(
        connection,
        { localeSettingId: created.id },
      );
    },
  );

  // Not-found UUID (well-formed but does not exist)
  await TestValidator.error(
    "nonexistent uuid yields not-found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.at(
        connection,
        { localeSettingId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
