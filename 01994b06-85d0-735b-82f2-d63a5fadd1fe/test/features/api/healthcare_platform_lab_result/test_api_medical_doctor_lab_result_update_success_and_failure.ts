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
 * E2E test for the PATCH
 * /healthcarePlatform/medicalDoctor/patientRecords/{patientRecordId}/encounters/{encounterId}/labResults
 * endpoint.
 *
 * This scenario covers both successful update of laboratory result search
 * (filtering, listing), and relevant business/role-based error cases for
 * lab result update workflow.
 *
 * Steps:
 *
 * 1. Register a medical doctor; login to set role.
 * 2. Register and login a nurse for dependency completeness (if needed).
 * 3. Register a patient.
 * 4. As org admin, create a patient record for that patient in an org.
 * 5. As medical doctor, create an encounter for the patient record.
 * 6. As admin, create a lab integration for the organization.
 * 7. As medical doctor, PATCH lab result search for the encounter using valid
 *    filter (happy path): should return matching result list for encounter
 *    (success).
 * 8. As medical doctor, PATCH with invalid encounterId (negative test): should
 *    yield error.
 * 9. As medical doctor, PATCH lab result for encounter with a lab integration
 *    ID not matching org (negative test): should yield error.
 * 10. As medical doctor, PATCH with wrong patient record id (negative test):
 *     should yield error.
 *
 * Validation:
 *
 * - On success: response contains ISummary result(s) for given encounter.
 * - On error: response yields error (invalid id/cross-org/business rule).
 */
export async function test_api_medical_doctor_lab_result_update_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a medical doctor (doctor)
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorJoin);

  // 2. Login as doctor
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorEmail,
        password: doctorPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin);

  // 3. Register and login a nurse (for completeness)
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseJoin);

  const nurseLogin = await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  typia.assert(nurseLogin);

  // 4. Register a patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientCreate =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1980, 1, 1).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientCreate);

  // 5. Login as org admin to create a patient record (org/department context):
  //   To do this, create org admin first
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
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
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 6. Create patient record for that patient under admin's organization
  const patientRecordRes =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdminJoin.id satisfies string,
          department_id: null,
          patient_user_id: patientCreate.id satisfies string,
          full_name: patientCreate.full_name,
          dob: patientCreate.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
          external_patient_number: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecordRes);

  // 7. As doctor, create an encounter for the patient record
  // Switch back to doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  const encounterRes =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecordRes.id satisfies string &
          tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecordRes.id satisfies string &
            tags.Format<"uuid">,
          provider_user_id: doctorJoin.id satisfies string &
            tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounterRes);

  // 8. As org admin, create a lab integration for organization (for lab linkage)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id:
            orgAdminJoin.id satisfies string & tags.Format<"uuid">,
          lab_vendor_code: RandomGenerator.paragraph({ sentences: 1 }),
          connection_uri: "https://lab.integration.example/api",
          supported_message_format: "HL7 V2",
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 9. As medical doctor, PATCH to update (search) lab result by valid encounter, org
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  const validLabResultSearchReq = {
    ehr_encounter_id: encounterRes.id satisfies string & tags.Format<"uuid">,
    lab_integration_id: labIntegration.id satisfies string &
      tags.Format<"uuid">,
    test_name: null,
    result_flag: null,
    status: null,
    resulted_at_from: null,
    resulted_at_to: null,
    created_at_from: null,
    created_at_to: null,
    page: 1,
    pageSize: 10,
    sort: null,
  } satisfies IHealthcarePlatformLabResult.IRequest;

  const searchOutput =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.index(
      connection,
      {
        patientRecordId: patientRecordRes.id satisfies string &
          tags.Format<"uuid">,
        encounterId: encounterRes.id satisfies string & tags.Format<"uuid">,
        body: validLabResultSearchReq,
      },
    );
  typia.assert(searchOutput);
  TestValidator.predicate(
    "lab result search returns list or empty array",
    Array.isArray(searchOutput.data),
  );

  // 10. Patch with wrong encounterId (negative case)
  await TestValidator.error(
    "PATCH with invalid encounterId yields error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecordRes.id satisfies string &
            tags.Format<"uuid">,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: validLabResultSearchReq,
        },
      );
    },
  );

  // 11. Patch with invalid lab integration (not matching org)
  const fakeLabIntegrationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "PATCH with invalid lab integration id (cross-ORG) yields error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecordRes.id satisfies string &
            tags.Format<"uuid">,
          encounterId: encounterRes.id satisfies string & tags.Format<"uuid">,
          body: {
            ...validLabResultSearchReq,
            lab_integration_id: fakeLabIntegrationId,
          },
        },
      );
    },
  );

  // 12. Patch with wrong patientRecordId (negative)
  await TestValidator.error(
    "PATCH with invalid patientRecordId yields error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          encounterId: encounterRes.id satisfies string & tags.Format<"uuid">,
          body: validLabResultSearchReq,
        },
      );
    },
  );
}
