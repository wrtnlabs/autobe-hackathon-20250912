import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This end-to-end test validates the deletion of a corporate learner by a
 * systemAdmin user.
 *
 * Following is the stepwise process:
 *
 * 1. Register a systemAdmin user with required valid credentials.
 * 2. Log in the systemAdmin to obtain auth tokens.
 * 3. Create a tenant organization with unique code and name.
 * 4. Create a corporate learner user under the created tenant.
 * 5. Delete the created corporate learner by its ID.
 * 6. Verify deletion succeeded (void response) without error.
 */
export async function test_api_corporatelearner_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin user
  const systemAdminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreate,
    });
  typia.assert(systemAdmin);

  // 2. Log in the systemAdmin user
  const systemAdminLogin = {
    email: systemAdmin.email,
    password_hash: systemAdminCreate.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLogin,
    });
  typia.assert(loggedInSystemAdmin);

  // 3. Create a tenant organization
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreate,
    });
  typia.assert(tenant);

  // 4. Create a corporate learner
  const corporateLearnerCreate = {
    tenant_id: tenant.id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.systemAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: corporateLearnerCreate,
      },
    );
  typia.assert(corporateLearner);

  // 5. Delete the created corporate learner
  await api.functional.enterpriseLms.systemAdmin.corporatelearners.eraseCorporatelearner(
    connection,
    {
      corporatelearnerId: corporateLearner.id,
    },
  );
}
