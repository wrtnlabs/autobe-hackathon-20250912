import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_organizationadmin_join_success(
  connection: api.IConnection,
) {
  // 1. Authenticate systemAdmin to obtain authorization for tenant creation
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdminAuthorized);

  // 2. Create a new tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })
      .replace(/\s+/g, "-")
      .toLowerCase(),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Register a new organization admin linked to the tenant
  const organizationAdminCreateBody = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(organizationAdminAuthorized);

  // 4. Validate the returned organization admin details
  TestValidator.equals(
    "organization admin tenant_id matches",
    organizationAdminAuthorized.tenant_id,
    tenant.id,
  );
  TestValidator.equals(
    "organization admin email matches",
    organizationAdminAuthorized.email,
    organizationAdminCreateBody.email,
  );
  TestValidator.equals(
    "organization admin first_name matches",
    organizationAdminAuthorized.first_name,
    organizationAdminCreateBody.first_name,
  );
  TestValidator.equals(
    "organization admin last_name matches",
    organizationAdminAuthorized.last_name,
    organizationAdminCreateBody.last_name,
  );

  // 5. Validate presence of JWT tokens
  TestValidator.predicate(
    "access token is non-empty",
    typeof organizationAdminAuthorized.token.access === "string" &&
      organizationAdminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof organizationAdminAuthorized.token.refresh === "string" &&
      organizationAdminAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date-time string",
    typeof organizationAdminAuthorized.token.expired_at === "string" &&
      !isNaN(Date.parse(organizationAdminAuthorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is a valid ISO date-time string",
    typeof organizationAdminAuthorized.token.refreshable_until === "string" &&
      !isNaN(Date.parse(organizationAdminAuthorized.token.refreshable_until)),
  );
}
