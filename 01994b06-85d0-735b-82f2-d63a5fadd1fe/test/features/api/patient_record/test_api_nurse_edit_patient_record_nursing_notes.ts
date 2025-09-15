import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for nurse updating patient record nursing notes.
 *
 * Steps:
 *
 * 1. Register and log in as systemAdmin.
 * 2. Create organization as systemAdmin.
 * 3. Register and log in as organizationAdmin.
 * 4. Create department as organizationAdmin.
 * 5. Register nurse in that department and log in as nurse.
 * 6. Register a patient user.
 * 7. Register a patient record as systemAdmin for org/department/patient.
 * 8. Log in as nurse and update the patient record via PUT, e.g. update
 *    demographics_json, status, or remarks in allowed fields.
 * 9. Validate patient record has expected updates.
 * 10. Negative: Attempt update with invalid patientRecordId for negative test.
 *
 * Note: There is no SDK function to GET a patient record by nurse or admin
 * role, so validation is performed based on the response of the update call.
 */
export async function test_api_nurse_edit_patient_record_nursing_notes(
  connection: api.IConnection,
) {
  // Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPa$$12345";
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(admin);

  // Create organization
  const orgCode = RandomGenerator.alphaNumeric(10);
  const orgName = RandomGenerator.name();
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: { code: orgCode, name: orgName, status: "active" },
      },
    );
  typia.assert(org);

  // Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdminPass987";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdmin);

  // Log in as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // Create department in organization
  const departmentCode = RandomGenerator.alphaNumeric(6);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: departmentCode,
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // Register nurse user
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = "NurseSecure1!";
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "General Ward",
      phone: RandomGenerator.mobile(),
      password: nursePassword,
    },
  });
  typia.assert(nurse);
  // Log in as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });

  // Register patient user
  const patientEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string;
  const patientPassword = "Patient123!";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date().toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // Register patient record as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      provider: "local",
      provider_key: adminEmail,
    },
  });
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: department.id,
          patient_user_id: patient.id,
          external_patient_number: "EMR-" + RandomGenerator.alphaNumeric(8),
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: "female",
          status: "active",
          demographics_json: JSON.stringify({ language: "en", allergies: [] }),
        },
      },
    );
  typia.assert(patientRecord);

  // Log back in as nurse to perform update
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });

  // Nurse updates nursing notes (demographics_json with nurse's note, status update)
  const updateBody = {
    demographics_json: JSON.stringify({
      notes: "Administered medication at 8am",
      language: "en",
      allergies: [],
    }),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.nurse.patientRecords.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "demographics_json updated",
    updated.demographics_json,
    updateBody.demographics_json,
  );
  TestValidator.equals("status updated", updated.status, updateBody.status);

  // Negative: Attempt update with invalid patientRecordId
  await TestValidator.error(
    "updating non-existent patientRecordId fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.update(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
