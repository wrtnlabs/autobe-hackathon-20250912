import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test: medical doctor updating a patient record in the
 * healthcare platform.
 *
 * 1. Register and authenticate a system admin
 * 2. System admin: create a new organization
 * 3. Register and authenticate an organization admin
 * 4. Organization admin: create a department in the organization
 * 5. Register and authenticate a patient
 * 6. System admin: create a patient record assigned to the org, dept, and
 *    patient
 * 7. Register and authenticate a medical doctor (doctor1), associated to
 *    org/department implicitly by login
 * 8. Doctor1: updates fields in the patient record using PUT (fields:
 *    full_name, gender, status, demographics_json)
 * 9. Validate: the update response returns the updated patient record; fields
 *    are changed, and organization/patient_user_id are not changeable
 * 10. Negative test: Register/login doctor2 (not in org/department), try same
 *     update, assert error thrown
 * 11. Negative test: Doctor1 attempts to update a non-existent patient
 *     recordId, assert error
 */
export async function test_api_medical_doctor_update_patient_record_details(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = RandomGenerator.name(2) + "@sysadmin.com";
  const sysAdminPassword = "SysPass123!";
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Org admin registration and login
  const orgAdminEmail = RandomGenerator.name(2) + "@orgadmin.com";
  const orgAdminPassword = "OrgAdmin!23";
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 4. Create department in org
  const deptCode = RandomGenerator.alphaNumeric(4);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: deptCode,
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Register patient user
  const patientEmail = RandomGenerator.name(2) + "@patient.com";
  const patientPassword = "Patient123!";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date(1990, 1, 1).toISOString() as string &
        tags.Format<"date-time">,
      password: patientPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(patient);

  // 6. System admin: create patient record
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
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
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 7. Register/login medical doctor 1
  const doctor1Email = RandomGenerator.name(2) + "@doctor.com";
  const doctor1Password = "Doctor1pass!";
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor1Email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctor1Password as string & tags.Format<"password">,
      specialty: "Cardiology",
      phone: RandomGenerator.mobile(),
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor1Email as string & tags.Format<"email">,
      password: doctor1Password as string & tags.Format<"password">,
    },
  });

  // 8. Doctor1 updates patient record (change several fields)
  const updateFields = {
    full_name: RandomGenerator.name(2),
    gender: RandomGenerator.pick(["male", "female", "other"] as const),
    status: "inactive",
    demographics_json: JSON.stringify({
      updateBy: "doctor1",
      notes: RandomGenerator.paragraph({ sentences: 3 }),
    }),
  } satisfies IHealthcarePlatformPatientRecord.IUpdate;
  const updatedRecord =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.update(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: updateFields,
      },
    );
  typia.assert(updatedRecord);
  TestValidator.equals(
    "updated full_name",
    updatedRecord.full_name,
    updateFields.full_name,
  );
  TestValidator.equals(
    "updated gender",
    updatedRecord.gender,
    updateFields.gender,
  );
  TestValidator.equals(
    "updated status",
    updatedRecord.status,
    updateFields.status,
  );
  TestValidator.equals(
    "updated demographics_json",
    updatedRecord.demographics_json,
    updateFields.demographics_json,
  );
  TestValidator.equals(
    "organization_id unchanged",
    updatedRecord.organization_id,
    org.id,
  );
  TestValidator.equals(
    "patient_user_id unchanged",
    updatedRecord.patient_user_id,
    patient.id,
  );

  // 9. Negative: register/login doctor2 (unauthorized)
  const doctor2Email = RandomGenerator.name(2) + "@doctor.com";
  const doctor2Password = "Doctor2pass!";
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor2Email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctor2Password as string & tags.Format<"password">,
      specialty: "Orthopedics",
      phone: RandomGenerator.mobile(),
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email as string & tags.Format<"email">,
      password: doctor2Password as string & tags.Format<"password">,
    },
  });
  await TestValidator.error(
    "unauthorized doctor should not be able to update the record",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.update(
        connection,
        {
          patientRecordId: patientRecord.id,
          body: { full_name: RandomGenerator.name(2) },
        },
      );
    },
  );

  // 10. Negative: Doctor1 tries to update non-existent record
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor1Email as string & tags.Format<"email">,
      password: doctor1Password as string & tags.Format<"password">,
    },
  });
  await TestValidator.error(
    "updating nonexistent recordId should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.update(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: { full_name: RandomGenerator.name(2) },
        },
      );
    },
  );
}
