import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful update of organization/department locale settings as an
 * Organization Admin.
 *
 * This test covers the following:
 *
 * 1. System Admin registers/logs in and creates a new organization.
 * 2. Organization Admin registers, logs in, and creates initial locale settings
 *    linked to the organization.
 * 3. Organization Admin updates the locale settings with new valid values.
 * 4. The response reflects the updated values, IDs match, updated_at is changed.
 */
export async function test_api_locale_settings_organization_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Register and login as System Admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: "admin!123",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdminJoin);

  // 2. Login as System Admin (token set)
  const sysAdminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "admin!123",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(sysAdminLogin);

  // 3. Create organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // Register Org Admin (for new org)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "admin!234",
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminJoin);

  // Login as Org Admin (token set)
  const orgAdminLogin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: "admin!234",
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(orgAdminLogin);

  // 4. Create initial locale settings for organization
  const localeCreateBody = {
    healthcare_platform_organization_id: organization.id,
    language: "ko-KR",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "1,234.56",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const localeSetting: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      { body: localeCreateBody },
    );
  typia.assert(localeSetting);

  // 5. Update the locale settings to new valid values
  const newLang = "en-US";
  const newTz = "America/New_York";
  const newDateFmt = "MM/DD/YYYY";
  const newTimeFmt = "12h";
  const newNumFmt = "1,234.56 (en-US)";
  const updateBody = {
    language: newLang,
    timezone: newTz,
    date_format: newDateFmt,
    time_format: newTimeFmt,
    number_format: newNumFmt,
  } satisfies IHealthcarePlatformLocaleSettings.IUpdate;

  const updated: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.update(
      connection,
      {
        localeSettingId: localeSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Assertions: IDs unchanged, updated fields match, updated_at changed
  TestValidator.equals(
    "localeSetting id unchanged",
    updated.id,
    localeSetting.id,
  );
  TestValidator.notEquals(
    "updated_at updated after update",
    updated.updated_at,
    localeSetting.updated_at,
  );
  TestValidator.equals("language updated", updated.language, newLang);
  TestValidator.equals("timezone updated", updated.timezone, newTz);
  TestValidator.equals("date_format updated", updated.date_format, newDateFmt);
  TestValidator.equals("time_format updated", updated.time_format, newTimeFmt);
  TestValidator.equals(
    "number_format updated",
    updated.number_format,
    newNumFmt,
  );
}
