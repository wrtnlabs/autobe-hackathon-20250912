import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate organization admin can update a technician profile and errors are
 * handled properly
 *
 * Business flow:
 *
 * 1. Register and log in organization admin
 * 2. Create a technician with unique email/license
 * 3. Update the technician profile fields (full_name, specialty, phone)
 * 4. Assert all updated fields have taken effect
 * 5. Fetch the technician profile using GET to verify updated data
 * 6. Create another technician with different email/license (for isolation)
 * 7. Attempt to update technician with invalid full_name (empty string) (should
 *    fail)
 * 8. (By DTO design, setting specialty or phone to null is allowed, so no error
 *    test for those) Note: Direct audit log inspection is not performed, but
 *    all changes are implicitly auditable by business rule
 */
export async function test_api_technician_profile_update_organization_admin_success_and_error(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Passw0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Create a technician with unique email/license
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const licenseNumber = RandomGenerator.alphaNumeric(10);
  const technicianCreate = {
    email: technicianEmail,
    full_name: RandomGenerator.name(),
    license_number: licenseNumber,
    specialty: "Radiology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const technician =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: technicianCreate },
    );
  typia.assert(technician);

  // 3. Update technician's profile (full_name, specialty, phone)
  const updateBody = {
    full_name: RandomGenerator.name(),
    specialty: "Pathology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.update(
      connection,
      {
        technicianId: technician.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Assert fields are changed
  TestValidator.notEquals(
    "full_name updated",
    updated.full_name,
    technician.full_name,
  );
  TestValidator.equals(
    "specialty updated",
    updated.specialty,
    updateBody.specialty,
  );
  TestValidator.equals("phone updated", updated.phone, updateBody.phone);

  // 5. Reload technician via GET and check fields
  const reloaded =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.at(
      connection,
      {
        technicianId: technician.id,
      },
    );
  typia.assert(reloaded);
  TestValidator.equals(
    "profile reload matches update",
    reloaded.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "profile reload specialty",
    reloaded.specialty,
    updateBody.specialty,
  );
  TestValidator.equals(
    "profile reload phone",
    reloaded.phone,
    updateBody.phone,
  );

  // 6. Create another technician (for isolation on update)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherLicense = RandomGenerator.alphaNumeric(10);
  const tech2 =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      {
        body: {
          email: otherEmail,
          full_name: RandomGenerator.name(),
          license_number: otherLicense,
          specialty: "Phlebotomy",
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(tech2);

  // 7. Error: attempt updating with invalid full_name
  await TestValidator.error(
    "update fails with empty string full_name",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.technicians.update(
        connection,
        {
          technicianId: technician.id,
          body: {
            full_name: "",
          },
        },
      );
    },
  );
}
