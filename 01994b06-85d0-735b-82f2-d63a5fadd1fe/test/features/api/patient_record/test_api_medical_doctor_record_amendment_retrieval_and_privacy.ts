import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";

/**
 * Validate the retrieval and privacy rules for medical doctor getting specific
 * patient record amendments.
 *
 * 1. Register organizationAdmin with unique credentials
 * 2. Register patient via organizationAdmin
 * 3. Create patient record via organizationAdmin
 * 4. Create a record amendment for the patient record
 * 5. Register and authenticate a medical doctor
 * 6. Retrieve the amendment as the correct doctor, assert full data
 * 7. Alter the patientRecordId to simulate unauthorized access, expect error
 * 8. Authenticate as a different medical doctor and attempt access, expect error
 * 9. (If API supported) Confirm viewing states and privacy for finalized/locked
 *    etc. amendments (simulate by creating amendments with different
 *    approval_status)
 */
export async function test_api_medical_doctor_record_amendment_retrieval_and_privacy(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 2. Patient registration
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientDOB = new Date(
    1980 + Math.floor(Math.random() * 30),
    0,
    1,
  ).toISOString();
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: patientDOB,
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 3. Create patient record
  const record: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(record);

  // 4. Create amendment
  const amendment: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: record.id as string & tags.Format<"uuid">,
          submitted_by_user_id: orgAdmin.id as string & tags.Format<"uuid">,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ field: "oldValue" }),
          new_value_json: JSON.stringify({ field: "newValue" }),
          rationale: RandomGenerator.paragraph(),
          approval_status: "pending",
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(amendment);

  // 5. Register and login as a medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorNPI,
        password: doctorPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor);

  // 6. Retrieve amendment as correct medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const viewed: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.at(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(viewed);
  TestValidator.equals(
    "retrieved amendment id matches",
    viewed.id,
    amendment.id,
  );
  TestValidator.equals(
    "retrieved patient_record_id matches",
    viewed.patient_record_id,
    record.id,
  );

  // 7. Retrieval with wrong patientRecordId (privacy isolation check)
  await TestValidator.error(
    "doctor cannot GET with mismatched patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(), // wrong id
          recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 8. Register second doctor, switch, try access (privacy boundary)
  const doctor2Email = typia.random<string & tags.Format<"email">>();
  const doctor2NPI = RandomGenerator.alphaNumeric(10);
  const doctor2Password = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor2Email,
      full_name: RandomGenerator.name(),
      npi_number: doctor2NPI,
      password: doctor2Password,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email,
      password: doctor2Password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "other doctor cannot view amendment for unrelated patient",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: record.id as string & tags.Format<"uuid">,
          recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 9. (Edge): If possible, create finalized amendment and check
  const finalAmendment: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: record.id as string & tags.Format<"uuid">,
          submitted_by_user_id: orgAdmin.id as string & tags.Format<"uuid">,
          amendment_type: "regulatory",
          old_value_json: JSON.stringify({ status: "inactive" }),
          new_value_json: JSON.stringify({ status: "active" }),
          rationale: RandomGenerator.paragraph(),
          approval_status: "approved",
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(finalAmendment);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const finalViewed: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.at(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        recordAmendmentId: finalAmendment.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(finalViewed);
  TestValidator.equals(
    "finalized amendment id matches",
    finalViewed.id,
    finalAmendment.id,
  );
  TestValidator.equals(
    "finalized amendment approval_status is approved",
    finalViewed.approval_status,
    "approved",
  );
}
