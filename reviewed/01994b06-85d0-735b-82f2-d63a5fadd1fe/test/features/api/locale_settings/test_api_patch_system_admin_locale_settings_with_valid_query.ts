import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLocaleSettings";

/**
 * Validate the system admin's ability to query, filter, and paginate locale
 * settings at the organization/department/platform level.
 *
 * 1. Register and login as a new health platform system admin (provider: 'local').
 * 2. Create a new organization and use its id for subsequent locale settings and
 *    query.
 * 3. Create a locale setting for said organization (no department).
 * 4. Query via PATCH using the org id, language, timezone, etc. and confirm the
 *    result matches.
 * 5. Query with pagination (page/limit), confirming consistent results.
 * 6. Query with a non-existent org id returns empty.
 * 7. Query for an existing org but with a random department id returns empty.
 * 8. Full type assertions and deep validation for all steps.
 */
export async function test_api_patch_system_admin_locale_settings_with_valid_query(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminName,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(join);

  // 2. Login (required to simulate login token flow)
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Create organization
  const orgCode = RandomGenerator.alphaNumeric(10);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 4. Create locale setting for organization only (no department)
  const localeCreate = {
    healthcare_platform_organization_id: org.id,
    language: RandomGenerator.pick([
      "en-US",
      "ko-KR",
      "fr-FR",
      "es-ES",
      "ja-JP",
      "de-DE",
    ] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/Berlin",
      "Asia/Tokyo",
    ] as const),
    date_format: RandomGenerator.pick([
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      "MM/DD/YYYY",
      "YYYY.MM.DD",
    ] as const),
    time_format: RandomGenerator.pick(["24h", "12h"] as const),
    number_format: RandomGenerator.pick([
      "1,234.56",
      "1.234,56",
      "1 234,56",
    ] as const),
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.create(
      connection,
      { body: localeCreate },
    );
  typia.assert(created);

  // 5. Query via PATCH with correct org + field filters
  const query1 =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.index(
      connection,
      {
        body: {
          organization_id: org.id,
          language: localeCreate.language,
          timezone: localeCreate.timezone,
          date_format: localeCreate.date_format,
          time_format: localeCreate.time_format,
          number_format: localeCreate.number_format,
        },
      },
    );
  typia.assert(query1);
  TestValidator.predicate(
    "correct setting comes back in filtered query",
    query1.data.some(
      (e) =>
        e.healthcare_platform_organization_id === org.id &&
        e.language === localeCreate.language &&
        e.timezone === localeCreate.timezone &&
        e.date_format === localeCreate.date_format &&
        e.time_format === localeCreate.time_format &&
        e.number_format === localeCreate.number_format,
    ),
  );

  // 6. Pagination - get with limit 1 (should get 1 result)
  const paged =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.index(
      connection,
      {
        body: { organization_id: org.id, limit: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination - current page",
    paged.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit respected",
    paged.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination - at least one record returned",
    paged.data.length >= 1,
  );

  // 7. Query with random organization_id (should return empty)
  const notFound =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.index(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(notFound);
  TestValidator.equals(
    "random org id returns zero data",
    notFound.data.length,
    0,
  );

  // 8. Query with real org but fake department (should return empty)
  const deptNotFound =
    await api.functional.healthcarePlatform.systemAdmin.localeSettings.index(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(deptNotFound);
  TestValidator.equals(
    "org+fake dept returns no matches",
    deptNotFound.data.length,
    0,
  );
}
