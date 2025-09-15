import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLocaleSettings";

/**
 * Test searching and filtering locale settings as an organization admin.
 *
 * 1. Register an organization admin
 * 2. Log in as that admin
 * 3. Create a locale setting for the organization
 * 4. Search for locale settings by PATCH with organization_id filter; verify
 *    result
 * 5. Search with language filter; verify correct record
 * 6. Search with random non-existent org/dept IDs; verify empty result
 * 7. Test pagination (limit/page)
 */
export async function test_api_patch_organization_admin_locale_settings_with_valid_query(
  connection: api.IConnection,
) {
  // 1. Register admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Abcd1234!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Log in admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const authed = await api.functional.auth.organizationAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(authed);

  // 3. Create locale setting for organization
  const createLocaleBody = {
    healthcare_platform_organization_id: admin.id as string &
      tags.Format<"uuid">,
    language: "en-US",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "1,234.56",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const locale =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      { body: createLocaleBody },
    );
  typia.assert(locale);

  // 4. Search by PATCH with org_id filter
  const searchByOrgBody = {
    organization_id: locale.healthcare_platform_organization_id!,
    limit: 10,
    page: 1,
  } satisfies IHealthcarePlatformLocaleSettings.IRequest;
  const searchResult =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.index(
      connection,
      { body: searchByOrgBody },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "result includes created locale",
    searchResult.data.some((l) => l.id === locale.id),
  );

  // 5. Search with additional language filter
  const searchByLangBody = {
    organization_id: locale.healthcare_platform_organization_id!,
    language: "en-US",
    limit: 10,
    page: 1,
  } satisfies IHealthcarePlatformLocaleSettings.IRequest;
  const langResult =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.index(
      connection,
      { body: searchByLangBody },
    );
  typia.assert(langResult);
  TestValidator.predicate(
    "filtered locale by language",
    langResult.data.some((l) => l.id === locale.id),
  );

  // 6. Negative: search with non-existent org/dept IDs (use random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const negativeResult =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.index(
      connection,
      { body: { organization_id: nonExistentId, limit: 10, page: 1 } },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "negative org_id returns empty list",
    negativeResult.data.length,
    0,
  );

  // 7. Pagination (if more settings are created, test page/limit)
  // Create an extra locale for pagination check
  const createLocaleBody2 = {
    healthcare_platform_organization_id: admin.id as string &
      tags.Format<"uuid">,
    language: "ko-KR",
    timezone: "Asia/Seoul",
    date_format: "YYYY.MM.DD",
    time_format: "24h",
    number_format: "1,234.56",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;
  const locale2 =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      { body: createLocaleBody2 },
    );
  typia.assert(locale2);
  // Now get limit=1 to paginate
  const paged1 =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.index(
      connection,
      {
        body: {
          organization_id: locale.healthcare_platform_organization_id!,
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paged1);
  TestValidator.equals("limit=1 returns 1 item", paged1.data.length, 1);
}
