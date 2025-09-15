import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPharmacyIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyIntegration";

/**
 * E2E test for pharmacy integration detail view endpoint covering:
 *
 * 1. Organization admin join & login flow
 * 2. Creation of a mock pharmacy integration and retrieval by ID (success
 *    case)
 * 3. Attempt to view detail with a random/non-existent pharmacyIntegrationId
 *    (should error; 404)
 * 4. Switch to another org admin and attempt access to the original
 *    integration (should error; org isolation)
 */
export async function test_api_pharmacy_integration_detail_view_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Organization admin join
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "testpassword1!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminEmail = orgAdminJoin.email;
  const orgAdminPassword = "testpassword1!";

  // 2. Login as admin (if token not already set by join)
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 3. Create a mock pharmacy integration for test (simulate, since no POST provided); use random data
  const pharmacyIntegration: IHealthcarePlatformPharmacyIntegration =
    typia.random<IHealthcarePlatformPharmacyIntegration>();

  // 4. Attempt GET by ID - expect success
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.at(
      connection,
      {
        pharmacyIntegrationId: pharmacyIntegration.id,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pharmacy integration ID matches",
    result.id,
    pharmacyIntegration.id,
  );

  // 5. GET with non-existent ID - expect error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "404 on non-existent pharmacyIntegrationId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.at(
        connection,
        {
          pharmacyIntegrationId: randomId,
        },
      );
    },
  );

  // 6. Organization admin join for another org
  const admin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "testpassword2!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2Join);
  const admin2Email = admin2Join.email;
  const admin2Password = "testpassword2!";

  // 7. Login as admin2
  const admin2Login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: admin2Email,
        password: admin2Password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(admin2Login);

  // 8. Attempt pharmacy detail view as admin2 (should deny)
  await TestValidator.error("cross-org access forbidden", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.pharmacyIntegrations.at(
      connection,
      {
        pharmacyIntegrationId: pharmacyIntegration.id,
      },
    );
  });
}
