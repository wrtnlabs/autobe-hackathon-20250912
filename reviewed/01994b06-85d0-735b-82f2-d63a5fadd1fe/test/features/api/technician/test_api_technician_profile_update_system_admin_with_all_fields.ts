import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician profile update by system admin (all mutable fields).
 *
 * 1. Register and login as a system admin.
 * 2. Create a technician using valid (unique) email and license number.
 * 3. Update all mutable fields (full_name, specialty, phone) for that technician.
 * 4. Retrieve and assert all updated fields have changed as expected.
 * 5. Attempt to update with invalid phone (invalid format) and specialty (too long
 *    string), verify errors.
 */
export async function test_api_technician_profile_update_system_admin_with_all_fields(
  connection: api.IConnection,
) {
  // 1. Register and login as sysadmin (local provider)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(joinRes);
  // Re-login for session consistency
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(loginRes);

  // 2. Create technician (all required fields, unique email/license)
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techLicense = RandomGenerator.alphaNumeric(8).toUpperCase();
  const techInitialFullName = RandomGenerator.name();
  const techInitialSpecialty = RandomGenerator.pick([
    "Radiology",
    "Lab",
    "ECG",
  ]);
  const techInitialPhone = RandomGenerator.mobile();
  const createdTech =
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      {
        body: {
          email: techEmail,
          full_name: techInitialFullName,
          license_number: techLicense,
          specialty: techInitialSpecialty,
          phone: techInitialPhone,
        },
      },
    );
  typia.assert(createdTech);
  // 3. Update all mutable fields
  const updatedFullName = RandomGenerator.name();
  const updatedSpecialty = RandomGenerator.pick([
    "Laboratory",
    "Phlebotomy",
    "Cardiology",
  ]);
  const updatedPhone = RandomGenerator.mobile();
  const updateRes =
    await api.functional.healthcarePlatform.systemAdmin.technicians.update(
      connection,
      {
        technicianId: createdTech.id,
        body: {
          full_name: updatedFullName,
          specialty: updatedSpecialty,
          phone: updatedPhone,
        },
      },
    );
  typia.assert(updateRes);
  TestValidator.equals(
    "full_name updated",
    updateRes.full_name,
    updatedFullName,
  );
  TestValidator.equals(
    "specialty updated",
    updateRes.specialty,
    updatedSpecialty,
  );
  TestValidator.equals("phone updated", updateRes.phone, updatedPhone);
  TestValidator.equals("id remains same", updateRes.id, createdTech.id);

  // 4. Retrieve and verify via GET
  const techRead =
    await api.functional.healthcarePlatform.systemAdmin.technicians.at(
      connection,
      {
        technicianId: createdTech.id,
      },
    );
  typia.assert(techRead);
  TestValidator.equals(
    "retrieved full_name updated",
    techRead.full_name,
    updatedFullName,
  );
  TestValidator.equals(
    "retrieved specialty updated",
    techRead.specialty,
    updatedSpecialty,
  );
  TestValidator.equals("retrieved phone updated", techRead.phone, updatedPhone);
  TestValidator.equals("retrieved id matches", techRead.id, createdTech.id);

  // 5. Error tests (invalid phone and specialty)
  await TestValidator.error("reject invalid phone format", async () => {
    await api.functional.healthcarePlatform.systemAdmin.technicians.update(
      connection,
      {
        technicianId: createdTech.id,
        body: {
          phone: "invalid-phone-format",
        },
      },
    );
  });
  await TestValidator.error(
    "reject specialty with too long string",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.technicians.update(
        connection,
        {
          technicianId: createdTech.id,
          body: {
            specialty: RandomGenerator.alphabets(300), // excessive length
          },
        },
      );
    },
  );
}
