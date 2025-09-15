import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates privileged systemAdmin access for any patient record amendment for
 * audit/compliance.
 *
 * Simulates admin registration, multi-role switching, medical org/patient
 * setup, record amendment creation, and privileged systemAdmin retrieval.
 *
 * Steps:
 *
 * 1. Register a systemAdmin (superuser).
 * 2. Log in as systemAdmin.
 * 3. Register an organization admin and log in.
 * 4. Register a patient through org admin.
 * 5. Create a patient record for the patient.
 * 6. Submit a record amendment as the org admin.
 * 7. Log back in as systemAdmin.
 * 8. Retrieve that amendment using systemAdmin privileges.
 * 9. Validate the response matches the IHealthcarePlatformRecordAmendment spec and
 *    includes audit/compliance fields.
 * 10. Validate 404 given non-existent amendment.
 * 11. Attempt forbidden access: try as org admin.
 */
export async function test_api_systemadmin_patientrecord_recordamendment_privileged_access(
  connection: api.IConnection,
) {
  // Step 1 & 2: Create system admin account and log in
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Step 3: Register organization admin and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 4: Register patient
  const patientCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1990, 1, 1).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientCreate },
    );
  typia.assert(patient);

  // Step 5: Register patient record
  const patientRecordCreate = {
    organization_id: orgAdminJoin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordCreate },
    );
  typia.assert(patientRecord);

  // Step 6: Create record amendment as org admin
  const amendmentCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    submitted_by_user_id: orgAdminJoin.id as string & tags.Format<"uuid">,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ field: "old" }),
    new_value_json: JSON.stringify({ field: "new" }),
    rationale: RandomGenerator.paragraph(),
    approval_status: "pending",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: amendmentCreate,
      },
    );
  typia.assert(amendment);

  // Step 7: Log back in as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Step 8: Retrieve amendment using systemAdmin privileges
  const result =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "systemAdmin receives correct amendment",
    result.id,
    amendment.id,
  );
  TestValidator.equals(
    "systemAdmin receives correct audit record fields",
    result.created_at,
    amendment.created_at,
  );
  TestValidator.equals(
    "systemAdmin receives old/new values",
    result.old_value_json,
    amendment.old_value_json,
  );

  // Step 9: Attempt to retrieve amendment with wrong ids (expect 404)
  await TestValidator.error(
    "404 error with random UUIDs for amendment retrieval",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 10: Try as non-systemAdmin (org admin): forbidden
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "forbidden for org admin to access other org's amendment via system endpoint",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
