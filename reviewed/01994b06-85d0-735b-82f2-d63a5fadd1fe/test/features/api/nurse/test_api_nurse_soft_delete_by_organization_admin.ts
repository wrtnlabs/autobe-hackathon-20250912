import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate the soft deletion (logical delete) flow for a nurse by an
 * organization admin.
 *
 * 1. Register a new organization admin and log in to obtain access.
 * 2. Create a nurse account as this admin - acquire the nurseId for deletion.
 * 3. Soft delete (DELETE) the nurse via organization admin endpoint.
 * 4. (Simulated: since there are no list/search endpoints exposed, indirectly
 *    confirm by error on repeated delete)
 * 5. Attempt to delete the same nurse again (should fail, as nurse is already
 *    deleted).
 * 6. Attempt to delete a random non-existent nurseId (should fail properly).
 * 7. Success is: DELETE works on valid nurse, error on duplicate/non-existent
 *    deletion.
 */
export async function test_api_nurse_soft_delete_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "adminPass1234",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // 2. Log in as org admin
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "adminPass1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 3. Register a nurse (admin context)
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      password: "nursePass1234",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse);
  const nurseId = nurse.id;

  // 4. DELETE as org admin
  await api.functional.healthcarePlatform.organizationAdmin.nurses.erase(
    connection,
    {
      nurseId,
    },
  );

  // 5. Attempt to delete again: should error
  await TestValidator.error(
    "Deleting already deleted nurse should throw error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.nurses.erase(
        connection,
        {
          nurseId,
        },
      );
    },
  );

  // 6. Attempt to delete a non-existent nurseId
  await TestValidator.error(
    "Deleting non-existent nurse should throw error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.nurses.erase(
        connection,
        {
          nurseId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
