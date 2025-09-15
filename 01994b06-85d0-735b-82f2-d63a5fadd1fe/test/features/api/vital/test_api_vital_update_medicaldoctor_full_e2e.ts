import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * End-to-end validation for medical doctor updating a patient's vital entry in
 * the EHR platform.
 *
 * The scenario follows the complete business workflow:
 *
 * 1. Register & login organization admin and doctor
 * 2. Admin creates organization and department
 * 3. Admin registers new patient and creates patient record in department
 * 4. Doctor creates encounter for this patient record
 * 5. Doctor posts a new vital sign entry
 * 6. Doctor updates the vital sign entry via PUT
 * 7. The test validates that the update actually changes the data
 * 8. The test includes an error scenario with an invalid vitalId (ensuring correct
 *    error handling)
 */
export async function test_api_vital_update_medicaldoctor_full_e2e(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "P@ssw0rd1";
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create and login system admin (for organization creation)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = "SysAdm1n!";
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization
  const orgCode = RandomGenerator.alphaNumeric(12);
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // Switch back to organization admin for department/patient flows
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create department
  const department: IHealthcarePlatformDepartment =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 4. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1985-08-21").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 5. Create patient record
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          department_id: department.id,
          patient_user_id: patient.id,
          external_patient_number: null,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: "other",
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Register and login medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = "DrSecure123!";
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorNPI,
        password: doctorPassword,
        specialty: "General Medicine",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 7. Doctor creates EHR encounter
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: doctor.id,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "emergency",
            "inpatient",
          ] as const),
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 8. Doctor records new vital
  const vitalType = RandomGenerator.pick([
    "heart_rate",
    "bp_systolic",
    "temp_c",
    "respiratory_rate",
  ] as const);
  const vitalValue = 98.8;
  const vitalUnit =
    vitalType === "heart_rate"
      ? "bpm"
      : vitalType === "bp_systolic"
        ? "mmHg"
        : vitalType === "temp_c"
          ? "C"
          : "rpm";
  const measuredAt = new Date().toISOString();
  const vital: IHealthcarePlatformVital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          vital_type: vitalType,
          vital_value: vitalValue,
          unit: vitalUnit,
          measured_at: measuredAt,
        } satisfies IHealthcarePlatformVital.ICreate,
      },
    );
  typia.assert(vital);

  // 9. Doctor updates vital
  const updatedValue = vitalValue + 2.2;
  const updatedUnit = vitalUnit;
  const updatedMeasuredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const updatedVital: IHealthcarePlatformVital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.update(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        vitalId: vital.id,
        body: {
          vital_value: updatedValue,
          unit: updatedUnit,
          measured_at: updatedMeasuredAt,
        } satisfies IHealthcarePlatformVital.IUpdate,
      },
    );
  typia.assert(updatedVital);
  TestValidator.equals(
    "vital value updated",
    updatedVital.vital_value,
    updatedValue,
  );
  TestValidator.equals("vital unit updated", updatedVital.unit, updatedUnit);
  TestValidator.equals(
    "vital measured_at updated",
    updatedVital.measured_at,
    updatedMeasuredAt,
  );

  // 10. Error case: invalid vitalId
  const invalidVitalId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with invalid vitalId should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.update(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          vitalId: invalidVitalId,
          body: {
            vital_value: 100,
          } satisfies IHealthcarePlatformVital.IUpdate,
        },
      );
    },
  );
}
