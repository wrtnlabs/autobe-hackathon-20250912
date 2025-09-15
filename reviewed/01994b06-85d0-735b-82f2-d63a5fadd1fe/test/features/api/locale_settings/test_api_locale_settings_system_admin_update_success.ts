import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a System Admin can successfully update an organization
 * locale setting's core properties (language, timezone, date/time/number
 * formatting).
 *
 * Steps:
 *
 * 1. Register and login as a System Admin (captures auth context)
 * 2. Create a new organization and get organizationId
 * 3. Create an initial locale setting scoped to the organization
 * 4. Update the locale setting with new language, timezone, date_format,
 *    time_format, and number_format
 * 5. Validate that the response reflects the new values and the correct
 *    organizationId. Verify original and updated values differ.
 */
export async function test_api_locale_settings_system_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Register and login as a System Admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Login (technically join auto-authenticates, but show explicit login usage)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 2. Create a new organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgCreate,
      },
    );
  typia.assert(organization);

  // 3. Create an initial locale setting for the organization
  const originalLocale = {
    healthcare_platform_organization_id: organization.id,
    language: "en-US",
    timezone: "America/New_York",
    date_format: "MM/DD/YYYY",
    time_format: "12h",
    number_format: "1,234.56",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const createdLocale =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      {
        body: originalLocale,
      },
    );
  typia.assert(createdLocale);

  // 4. Update the locale setting with different values
  const updatePayload = {
    language: "ko-KR",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "1.234,56",
  } satisfies IHealthcarePlatformLocaleSettings.IUpdate;
  const updatedLocale =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.update(
      connection,
      {
        localeSettingId: createdLocale.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedLocale);

  // 5. Validate update result
  TestValidator.equals(
    "locale ID is unchanged",
    updatedLocale.id,
    createdLocale.id,
  );
  TestValidator.equals(
    "organization binding is unchanged",
    updatedLocale.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.notEquals(
    "language changed",
    updatedLocale.language,
    createdLocale.language,
  );
  TestValidator.equals(
    "language updated",
    updatedLocale.language,
    updatePayload.language,
  );
  TestValidator.notEquals(
    "timezone changed",
    updatedLocale.timezone,
    createdLocale.timezone,
  );
  TestValidator.equals(
    "timezone updated",
    updatedLocale.timezone,
    updatePayload.timezone,
  );
  TestValidator.notEquals(
    "date_format changed",
    updatedLocale.date_format,
    createdLocale.date_format,
  );
  TestValidator.equals(
    "date_format updated",
    updatedLocale.date_format,
    updatePayload.date_format,
  );
  TestValidator.notEquals(
    "time_format changed",
    updatedLocale.time_format,
    createdLocale.time_format,
  );
  TestValidator.equals(
    "time_format updated",
    updatedLocale.time_format,
    updatePayload.time_format,
  );
  TestValidator.notEquals(
    "number_format changed",
    updatedLocale.number_format,
    createdLocale.number_format,
  );
  TestValidator.equals(
    "number_format updated",
    updatedLocale.number_format,
    updatePayload.number_format,
  );
}
