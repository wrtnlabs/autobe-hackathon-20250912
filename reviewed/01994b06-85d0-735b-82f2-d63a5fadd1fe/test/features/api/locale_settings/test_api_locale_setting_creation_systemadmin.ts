import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for creating locale settings as a system admin, including
 * business constraint and validation coverage.
 *
 * 1. Create and authenticate a system admin (grants all permissions).
 * 2. Create a test healthcare organization (used as org context for scoping).
 * 3. Create a locale settings record for the organization with valid fields
 *    (language, timezone, date/time/number format).
 * 4. Assert all returned fields (including id, timestamps, and business
 *    scoping fields).
 * 5. Attempt to create a second settings for the same org (should fail:
 *    uniqueness constraint).
 * 6. Attempt with missing required fields (should fail: validation error at
 *    runtime, NOT type error).
 * 7. Attempt with invalid language/timezone values (should fail: runtime error
 *    for unsupported value).
 * 8. Attempt creation without authentication (unauthorized).
 */
export async function test_api_locale_setting_creation_systemadmin(
  connection: api.IConnection,
) {
  // Step 1: System Admin sign-up & authentication
  const adminEmail = `${RandomGenerator.alphabets(8)}@corp-example.com`;
  const adminRegister = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminRegister,
    });
  typia.assert(admin);

  // Step 2: Create test organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(org);

  // Step 3: Create locale settings (valid input)
  const localeSettingsCreate = {
    healthcare_platform_organization_id: org.id,
    language: "en-US",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "1,234.56",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const locale: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      { body: localeSettingsCreate },
    );
  typia.assert(locale);
  TestValidator.equals(
    "organization id matches",
    locale.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals("language matches input", locale.language, "en-US");
  TestValidator.equals("timezone matches", locale.timezone, "Asia/Seoul");
  TestValidator.predicate(
    "has created_at and updated_at",
    typeof locale.created_at === "string" &&
      typeof locale.updated_at === "string",
  );

  // Step 4: Attempt duplicate locale settings (should fail)
  await TestValidator.error(
    "uniqueness constraint: duplicate org setting rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
        connection,
        { body: localeSettingsCreate },
      );
    },
  );

  // Step 5: Missing required field (no language)
  const missingLanguage = {
    healthcare_platform_organization_id: org.id,
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "1,234.56",
    // language intentionally omitted for runtime validation error
  } satisfies Partial<IHealthcarePlatformLocaleSettings.ICreate> as IHealthcarePlatformLocaleSettings.ICreate;
  await TestValidator.error(
    "validation: missing required field 'language'",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
        connection,
        { body: missingLanguage },
      );
    },
  );

  // Step 6: Invalid language value (unsupported)
  const unsupportedLanguage = {
    ...localeSettingsCreate,
    language: "xx-YY",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  await TestValidator.error(
    "runtime validation: unsupported language",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
        connection,
        { body: unsupportedLanguage },
      );
    },
  );

  // Step 7: Without authentication (simulate unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "permission enforcement: unauthenticated locale creation rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
        unauthConn,
        { body: localeSettingsCreate },
      );
    },
  );
}
