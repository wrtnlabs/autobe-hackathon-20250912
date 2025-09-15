import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin updating a medical doctor in their organization.
 *
 * 1. Register and login as an organization admin
 * 2. Create a medical doctor in the organization
 * 3. Update allowed fields on the created doctor (email, full_name, specialty,
 *    phone)
 * 4. Check that the doctor information is updated
 * 5. Negative: Attempt to update with non-existent doctorId (should error)
 * 6. Negative: Attempt to update with duplicate email (should error)
 * 7. Negative: Attempt to update with forbidden/unauthorized role (should error)
 * 8. Negative: Attempt to update a doctor not belonging to the admin's
 *    organization (should error)
 */
export async function test_api_medical_doctor_update_by_org_admin_full_e2e(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: "password123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as org admin (refresh token)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "password123",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctorCreateBody = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: doctorNpi,
    specialty: "Cardiology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      { body: doctorCreateBody },
    );
  typia.assert(doctor);

  // 4. Update doctor fields
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = {
    email: newEmail,
    full_name: RandomGenerator.name(),
    specialty: "Neurology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IUpdate;
  const updatedDoctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.update(
      connection,
      { medicalDoctorId: doctor.id, body: updateBody },
    );
  typia.assert(updatedDoctor);
  TestValidator.equals("doctor id unchanged", updatedDoctor.id, doctor.id);
  TestValidator.equals("doctor email updated", updatedDoctor.email, newEmail);
  TestValidator.equals(
    "doctor full name updated",
    updatedDoctor.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "doctor specialty updated",
    updatedDoctor.specialty,
    updateBody.specialty,
  );
  TestValidator.equals(
    "doctor phone updated",
    updatedDoctor.phone,
    updateBody.phone,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedDoctor.updated_at,
    doctor.updated_at,
  );

  // 5. Negative: non-existent doctorId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent doctorId", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.update(
      connection,
      { medicalDoctorId: fakeId, body: updateBody },
    );
  });

  // 6. Negative: duplicate email
  // Create 2nd doctor
  const doctor2Body = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    specialty: "Derma",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctor2 =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      { body: doctor2Body },
    );
  typia.assert(doctor2);
  // Try to update doctor2's email to that of the original doctor
  await TestValidator.error("duplicate email on update", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.update(
      connection,
      {
        medicalDoctorId: doctor2.id,
        body: {
          email: newEmail,
        } satisfies IHealthcarePlatformMedicalDoctor.IUpdate,
      },
    );
  });

  // 7. Negative: forbidden/unauthorized role
  // Register another org admin in a different context, try to update our original doctor
  const otherAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherAdminJoinBody = {
    email: otherAdminEmail,
    full_name: RandomGenerator.name(),
    password: "pw456",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const otherAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: otherAdminJoinBody },
  );
  typia.assert(otherAdmin);
  const otherAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: otherAdminEmail,
        password: "pw456",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(otherAdminLogin);
  // Try to update first doctor's fields with other admin
  await TestValidator.error("update by non-belonging org admin", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.update(
      connection,
      {
        medicalDoctorId: doctor.id,
        body: {
          full_name: RandomGenerator.name(),
        } satisfies IHealthcarePlatformMedicalDoctor.IUpdate,
      },
    );
  });
}
