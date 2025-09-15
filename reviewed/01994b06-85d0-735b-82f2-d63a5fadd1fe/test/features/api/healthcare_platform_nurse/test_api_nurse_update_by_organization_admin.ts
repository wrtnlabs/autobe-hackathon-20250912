import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin updates existing nurse staff member profile info and
 * validates update logic and error handling.
 *
 * Workflow:
 *
 * 1. Register and authenticate an organization admin (post
 *    /auth/organizationAdmin/join).
 * 2. Create a nurse staff account (post
 *    /healthcarePlatform/organizationAdmin/nurses).
 * 3. Successfully update the nurse profile with partial and full updates (put
 *    /healthcarePlatform/organizationAdmin/nurses/{nurseId} -- new full_name,
 *    new email, new specialty and phone).
 * 4. Validate that nurse profile reflects the correct changes after each update.
 * 5. Attempt updates with duplicate email or duplicate license_number (should fail
 *    with error).
 * 6. Attempt to update non-existent nurse by random UUID (should fail with error).
 */
export async function test_api_nurse_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register/admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "adminpass123",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create original nurse
  const nurseCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    specialty: "Pediatrics",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const nurse =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      { body: nurseCreateBody },
    );
  typia.assert(nurse);

  // 3a. Update the nurse's full_name and specialty (partial update)
  const updateA = {
    full_name: RandomGenerator.name(),
    specialty: "ICU",
  } satisfies IHealthcarePlatformNurse.IUpdate;
  const nurseA =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.update(
      connection,
      { nurseId: nurse.id, body: updateA },
    );
  typia.assert(nurseA);
  TestValidator.equals(
    "nurse full_name updated",
    nurseA.full_name,
    updateA.full_name,
  );
  TestValidator.equals(
    "nurse specialty updated",
    nurseA.specialty,
    updateA.specialty,
  );

  // 3b. Update the nurse's email and phone (another partial update)
  const updateB = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IUpdate;
  const nurseB =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.update(
      connection,
      { nurseId: nurse.id, body: updateB },
    );
  typia.assert(nurseB);
  TestValidator.equals("nurse email updated", nurseB.email, updateB.email);
  TestValidator.equals("nurse phone updated", nurseB.phone, updateB.phone);

  // 4. Try to set email to a duplicate (the original admin email, must fail)
  await TestValidator.error("duplicate email forbidden", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.update(
      connection,
      {
        nurseId: nurse.id,
        body: { email: admin.email } satisfies IHealthcarePlatformNurse.IUpdate,
      },
    );
  });

  // 5. Try to set license_number to a duplicate (already used by the same nurse, should allow, but create another nurse for true dupe)
  const otherNurseCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
  } satisfies IHealthcarePlatformNurse.ICreate;
  const otherNurse =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.create(
      connection,
      { body: otherNurseCreate },
    );
  typia.assert(otherNurse);

  await TestValidator.error(
    "duplicate license_number not allowed",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.nurses.update(
        connection,
        {
          nurseId: nurse.id,
          body: {
            license_number: otherNurse.license_number,
          } satisfies IHealthcarePlatformNurse.IUpdate,
        },
      );
    },
  );

  // 6. Try to update non-existent nurse (random UUID)
  await TestValidator.error("cannot update non-existent nurse", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.update(
      connection,
      {
        nurseId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          full_name: "Ghost Nurse",
        } satisfies IHealthcarePlatformNurse.IUpdate,
      },
    );
  });
}
