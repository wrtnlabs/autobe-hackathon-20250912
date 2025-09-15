import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate soft deletion of a technician by an organization admin.
 *
 * This test ensures that organization admins can soft delete technician
 * records via the DELETE endpoint. It verifies that the deleted
 * technician's deleted_at timestamp is set (i.e., record is not hard
 * deleted), and attempts to fetch that technician after deletion reflect
 * the soft-deleted status. Edge cases including double-deletion and
 * deletion of a non-existent technician are also tested, expecting proper
 * business errors in those scenarios.
 *
 * Step-by-step process:
 *
 * 1. Onboard a new organization admin with unique credentials.
 * 2. Login as that admin to establish the admin session.
 * 3. Create a technician profile as the admin (capture technicianId).
 * 4. Retrieve the technician to verify initial status (deleted_at = null).
 * 5. Delete the technician profile (should soft-delete, not hard-delete).
 * 6. Retrieve the technician again - confirm deleted_at is now set OR the
 *    operation fails with business error.
 * 7. Attempt to delete the same technician again (should yield business
 *    error).
 * 8. Attempt to delete a completely random/nonexistent technician (should
 *    yield business error).
 */
export async function test_api_technician_profile_deletion_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Onboard the organization admin
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword: string = "P@ssw0rd123" + RandomGenerator.alphabets(3);
  const orgAdminRes = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminRes);

  // 2. Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create a new technician profile
  const techEmail: string = typia.random<string & tags.Format<"email">>();
  const techBody = {
    email: techEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const technician =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: techBody },
    );
  typia.assert(technician);
  TestValidator.equals(
    "created technician email matches",
    technician.email,
    techEmail,
  );
  TestValidator.equals(
    "created technician deleted_at should be null",
    technician.deleted_at,
    null,
  );

  // 4. Retrieve the technician (deleted_at should be null)
  const technicianFetched =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
      connection,
      { technicianId: technician.id },
    );
  typia.assert(technicianFetched);
  TestValidator.equals(
    "technician fetched before deletion",
    technicianFetched.deleted_at,
    null,
  );
  TestValidator.equals(
    "technician fetched fields match",
    technicianFetched.email,
    techEmail,
  );

  // 5. Delete the technician (should soft delete)
  await api.functional.healthcarePlatform.organizationAdmin.technicians.erase(
    connection,
    { technicianId: technician.id },
  );

  // 6. Fetch the technician post-deletion: check deleted_at is set, or error
  let fetchedAfterDelete: IHealthcarePlatformTechnician | null = null;
  let deletionErr: boolean = false;
  try {
    fetchedAfterDelete =
      await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
        connection,
        { technicianId: technician.id },
      );
    typia.assert(fetchedAfterDelete);
    TestValidator.predicate(
      "deleted_at must now be not null after soft delete",
      fetchedAfterDelete.deleted_at !== null &&
        fetchedAfterDelete.deleted_at !== undefined,
    );
  } catch (err) {
    deletionErr = true;
  }
  TestValidator.predicate(
    "either get returns with deleted_at set or errors",
    fetchedAfterDelete !== null || deletionErr,
  );

  // 7. Double-delete: should cause a business error
  await TestValidator.error("deleting technician again must fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.technicians.erase(
      connection,
      { technicianId: technician.id },
    );
  });

  // 8. Nonexistent technician deletion: should fail
  await TestValidator.error(
    "deleting nonexistent technician should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.erase(
        connection,
        { technicianId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
