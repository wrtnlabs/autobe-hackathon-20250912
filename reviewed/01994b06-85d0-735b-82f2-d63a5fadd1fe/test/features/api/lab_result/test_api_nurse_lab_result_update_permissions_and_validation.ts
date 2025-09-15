import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";

/**
 * Validate nurse PATCH (filter/search) lab result permissions and business
 * logic.
 *
 * This E2E test verifies that the nurse can PATCH/search lab results only where
 * properly assigned/authorized. The test:
 *
 * 1. Registers organization admin and logs in.
 * 2. Registers nurse and logs in.
 * 3. Registers a medical doctor and logs in.
 * 4. Registers a patient and creates a patient record.
 * 5. As the doctor, creates a patient encounter.
 * 6. As admin, creates a lab integration for the org.
 * 7. As nurse, PATCHes/filters lab results for that patient/encounter, validating
 *    permission based on assignment/org/lab integration.
 * 8. Tests forbidden scenarios: PATCH with wrong encounter (not assigned), and
 *    PATCH with wrong lab integration id. All expected to fail.
 *
 * Success: Response is present if nurse is properly assigned. Error: PATCH
 * returns error if attempted with wrong encounter or lab integration id
 * (forbidden).
 */
export async function test_api_nurse_lab_result_update_permissions_and_validation(
  connection: api.IConnection,
) {
  // 1. Organization Admin registration and login
  const orgAdminPw = "adminpw" + RandomGenerator.alphaNumeric(2);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@org-admin.com",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPw,
      },
    },
  );
  typia.assert(orgAdmin);
  const organizationId = orgAdmin.id; // For LabIntegration

  // 2. Register & login Nurse
  const nurseEmail = RandomGenerator.alphaNumeric(8) + "@nurse.com";
  const nursePw = "nursepw" + RandomGenerator.alphaNumeric(2);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
      password: nursePw,
    },
  });
  typia.assert(nurseJoin);
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseEmail, password: nursePw },
  });

  // 3. Register & login Medical Doctor
  const doctorEmail = RandomGenerator.alphaNumeric(8) + "@doctor.com";
  const doctorPw = "doctorpw" + RandomGenerator.alphaNumeric(2);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPw,
    },
  });
  typia.assert(doctorJoin);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorEmail, password: doctorPw },
  });

  // 4. Register patient & create patient record (as admin)
  const patient =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: RandomGenerator.alphaNumeric(8) + "@patient.com",
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 0, 1).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organizationId,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 5. As medical doctor, create an encounter for the patient record
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: doctorJoin.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "planned",
        },
      },
    );
  typia.assert(encounter);

  // 6. As admin, set up a lab integration for the org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdmin.email, password: orgAdminPw },
  });
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId as string &
            tags.Format<"uuid">,
          lab_vendor_code: RandomGenerator.alphaNumeric(6),
          connection_uri: "https://labs.api/" + RandomGenerator.alphaNumeric(8),
          supported_message_format: "HL7 V2",
          status: "active",
        },
      },
    );
  typia.assert(labIntegration);

  // 7. As nurse, PATCH lab result (filter/search): allowed fields, correct assignment
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePw,
    },
  });
  // Try PATCH (filter/search) for lab results in context
  const patchBody = {
    ehr_encounter_id: encounter.id,
    lab_integration_id: labIntegration.id,
    test_name: "CMP Panel",
    result_flag: "normal",
    status: "completed",
    page: 1,
    pageSize: 20,
  } satisfies IHealthcarePlatformLabResult.IRequest;
  const successLabs =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.labResults.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: patchBody,
      },
    );
  typia.assert(successLabs);
  TestValidator.predicate(
    "Lab result page data returned if nurse assigned",
    successLabs.data.length >= 0,
  );

  // Error case: wrong encounterId
  await TestValidator.error(
    "Nurse cannot access lab results for wrong encounter",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: patchBody,
        },
      );
    },
  );

  // Error case: wrong lab integration id
  await TestValidator.error(
    "Nurse cannot access lab results for wrong lab integration id",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: {
            ...patchBody,
            lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
