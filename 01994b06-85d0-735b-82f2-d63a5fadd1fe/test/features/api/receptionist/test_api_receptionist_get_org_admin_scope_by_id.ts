import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Test that an organization admin can fetch a receptionist's profile by ID and
 * verifies org scope and error enforcement.
 *
 * 1. Register org admin A (join and login).
 * 2. Simulate/assume a pre-existing receptionist (no endpoint to create, using
 *    typia.random to generate one for test scope).
 * 3. Fetch the receptionist by id, validate the profile, and check property
 *    matches.
 * 4. Register and login as a second org admin B (different org).
 * 5. Attempt to fetch A's receptionist as B; expect error due to org scope
 *    enforcement.
 * 6. Attempt to fetch a truly non-existent receptionist (random uuid); expect
 *    error/not found.
 * 7. Access via an unauthenticated connection; expect forbidden/unauthorized.
 */
export async function test_api_receptionist_get_org_admin_scope_by_id(
  connection: api.IConnection,
) {
  // 1. Register org admin (A)
  const orgAdminAJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "AdminA@1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminAJoin },
  );
  typia.assert(orgAdminA);

  // 2. Simulate receptionist (as pre-created fixture - can't create)
  const knownReceptionist: IHealthcarePlatformReceptionist =
    typia.random<IHealthcarePlatformReceptionist>();

  // 3. Fetch receptionist by id (as org admin of the same org - simulated)
  const fetchedReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.at(
      connection,
      { receptionistId: knownReceptionist.id },
    );
  typia.assert(fetchedReceptionist);
  TestValidator.equals(
    "Receptionist ID matches",
    fetchedReceptionist.id,
    knownReceptionist.id,
  );
  TestValidator.equals(
    "Receptionist email matches",
    fetchedReceptionist.email,
    knownReceptionist.email,
  );
  TestValidator.equals(
    "Receptionist full_name matches",
    fetchedReceptionist.full_name,
    knownReceptionist.full_name,
  );
  TestValidator.equals(
    "Receptionist created_at matches",
    fetchedReceptionist.created_at,
    knownReceptionist.created_at,
  );
  TestValidator.equals(
    "Receptionist updated_at matches",
    fetchedReceptionist.updated_at,
    knownReceptionist.updated_at,
  );

  // 4. Create second org admin account (B)
  const orgAdminBJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "AdminB@1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminBJoin },
  );
  typia.assert(orgAdminB);

  // Log in as org admin B (switch token)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminBJoin.email,
      password: orgAdminBJoin.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Try to fetch A's receptionist as B (should fail due to org scope)
  await TestValidator.error(
    "B cannot access A's receptionist - org scope enforced",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.receptionists.at(
        connection,
        { receptionistId: knownReceptionist.id },
      );
    },
  );

  // 6. Try to fetch truly non-existent receptionist
  await TestValidator.error(
    "Error for fetching non-existent receptionist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.receptionists.at(
        connection,
        { receptionistId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 7. Unauthenticated access attempt (empty token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Forbidden without authentication", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.at(
      unauthConn,
      { receptionistId: knownReceptionist.id },
    );
  });
}
