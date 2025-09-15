import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a system admin can permanently delete an existing locale
 * setting (by UUID) and that business constraints and error cases are
 * handled.
 *
 * Workflow:
 *
 * 1. Register & login as system admin, get privileged session.
 * 2. Create a unique test organization.
 * 3. Create a locale setting for this organization (capture its id).
 * 4. Delete (erase) the locale setting.
 * 5. Attempt to delete the same locale setting again → expect not found.
 * 6. Try deleting random non-existent UUID → expect not found.
 * 7. Confirm the organization still exists and is unaffected.
 * 8. Create and delete a second unrelated locale setting, ensure other
 *    settings are not affected.
 * 9. [If possible] Try deletion as non-admin, expect forbidden (skipped if no
 *    such API).
 */
export async function test_api_locale_settings_system_admin_deletion(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // Login (enforce token refresh, ensures session is valid)
  const systemAdminSession = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: password,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(systemAdminSession);

  // 2. Create new organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 3. Create locale setting for this organization
  const localeSetting =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: null,
          language: "en-US",
          timezone: "Asia/Seoul",
          date_format: "YYYY-MM-DD",
          time_format: "24h",
          number_format: "1,234.56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(localeSetting);

  // 4. Delete (erase) the locale setting
  await api.functional.healthcarePlatform.systemAdmin.localeSettings.erase(
    connection,
    {
      localeSettingId: localeSetting.id,
    },
  );

  // 5. Attempt to delete again (should yield not found)
  await TestValidator.error(
    "Deleting an already deleted locale setting yields not-found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.erase(
        connection,
        {
          localeSettingId: localeSetting.id,
        },
      );
    },
  );

  // 6. Try deleting random non-existent UUID
  await TestValidator.error(
    "Deleting random non-existent locale setting yields not-found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.erase(
        connection,
        {
          localeSettingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Confirm organization still exists
  // (No direct GET org API provided in scope, so verify by creating new locale setting)
  const confirmLocale =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: null,
          language: "ko-KR",
          timezone: "Asia/Seoul",
          date_format: "YYYY.MM.DD",
          time_format: "24h",
          number_format: "1.234,56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(confirmLocale);

  // 8. Create and delete another locale setting to ensure system is consistent
  const otherLocale =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: null,
          language: "fr-FR",
          timezone: "Europe/Paris",
          date_format: "DD/MM/YYYY",
          time_format: "24h",
          number_format: "1 234,56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(otherLocale);

  // Delete this second locale setting as cleanup
  await api.functional.healthcarePlatform.systemAdmin.localeSettings.erase(
    connection,
    {
      localeSettingId: otherLocale.id,
    },
  );

  // 9. [If other role API present] Would test forbidden - SKIPPED (no user role API in provided scope)
}
