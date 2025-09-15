import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validate that an organization admin can view a patient's encounter detail in
 * compliance/audit context, and that role boundaries and error handling are
 * properly enforced.
 *
 * 1. Register and log in as organization admin
 * 2. Create a patient record (admin context)
 * 3. Register and log in as medical doctor (for encounter creation)
 * 4. Create an encounter for the patient record (doctor context)
 * 5. Switch back to organization admin and fetch encounter detail by ID (success)
 * 6. Validate that the returned data has all expected fields and correct data
 * 7. Try to access a bogus/nonexistent encounter or patient record (fail path,
 *    expect error)
 */
export async function test_api_organization_admin_access_patient_encounter_detail(
  connection: api.IConnection,
) {
  // Step 1: Register org admin & login
  // Use the same credentials for join+login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Immediately login as admin to simulate fresh session
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 2: Create a patient record
  // Simulate an existing patient user UUID (in real system would be a user lookup/creation - here just randomize)
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecordBody = {
    organization_id: admin.id,
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date(1990, 1, 1).toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordBody },
    );
  typia.assert(patientRecord);
  TestValidator.equals(
    "patient record organization matches admin",
    patientRecord.organization_id,
    admin.id,
  );
  TestValidator.equals(
    "patient record user reference matches",
    patientRecord.patient_user_id,
    patientUserId,
  );

  // Step 3: Register and login as a medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorJoinBody = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: doctorPassword,
    specialty: "general",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: doctorJoinBody,
    });
  typia.assert(doctor);

  // Login as medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // Step 4: Doctor creates an encounter for patient record
  const encounterCreateBody = {
    patient_record_id: patientRecord.id,
    provider_user_id: doctor.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
    notes: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: encounterCreateBody,
      },
    );
  typia.assert(encounter);
  TestValidator.equals(
    "encounter patient record id matches",
    encounter.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "encounter provider id matches",
    encounter.provider_user_id,
    doctor.id,
  );
  TestValidator.equals("encounter status saved", encounter.status, "active");

  // Step 5: Switch back to organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 6: As org admin, fetch the encounter detail
  const encounterDetail: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.at(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
      },
    );
  typia.assert(encounterDetail);
  TestValidator.equals(
    "admin can fetch encounter for patient record",
    encounterDetail.id,
    encounter.id,
  );
  TestValidator.equals(
    "encounter detail fields (provider)",
    encounterDetail.provider_user_id,
    doctor.id,
  );
  TestValidator.equals(
    "encounter detail patient record matches",
    encounterDetail.patient_record_id,
    patientRecord.id,
  );

  // Step 7: Negative path - attempt to fetch with bogus patientRecordId/encounterId
  const bogusUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching with bogus patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: bogusUuid,
          encounterId: encounter.id,
        },
      );
    },
  );
  await TestValidator.error(
    "fetching with bogus encounterId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: bogusUuid,
        },
      );
    },
  );
}
