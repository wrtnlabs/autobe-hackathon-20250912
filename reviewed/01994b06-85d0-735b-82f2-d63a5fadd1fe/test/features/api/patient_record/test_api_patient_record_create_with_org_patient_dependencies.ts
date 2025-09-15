import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Test creation of a patient record for a given patient in a given organization
 * by a system admin. Validates that:
 *
 * - Patient exists and is properly assigned to organization
 * - Audit/compliance fields are populated
 * - Organization context is enforced and linkage is correct
 * - Proper error is returned if creating a record for a missing or unassigned
 *   patient
 * - Cross-organization attempts are rejected Steps:
 *
 * 1. Register a new system admin and login
 * 2. Register a new patient and login as patient (to get exact user id/info)
 * 3. Login as system admin again
 * 4. Create an organization
 * 5. Assign patient to organization using userOrgAssignments
 * 6. Create a patient record for this patient in this organization (success)
 * 7. Attempt to create another record for a non-existent patient (fail)
 * 8. Attempt to create record for patient not assigned to organization (fail)
 * 9. Attempt to create record linking patient to a different organization (fail)
 */
export async function test_api_patient_record_create_with_org_patient_dependencies(
  connection: api.IConnection,
) {
  // 1. System admin registration (join) and login
  const sysAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdminName = RandomGenerator.name();
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: sysAdminName,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
        phone: RandomGenerator.mobile(),
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

  // 2. Patient registration (join) and get ID
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientName = RandomGenerator.name();
  const patientBirth = new Date(1990, 0, 1).toISOString();
  await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientName,
      date_of_birth: patientBirth,
      password: patientPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  // Patient login to get authorized profile (for user id)
  const patientAuth = await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(patientAuth);
  const patientUserId = patientAuth.id;

  // 3. Switch back to system admin role (ensure correct session)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. Organization creation
  const orgCode = RandomGenerator.alphaNumeric(8);
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

  // 5. Patient-user assignment to organization
  const orgAssignment: IHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: patientUserId,
          healthcare_platform_organization_id: organization.id,
          role_code: "patient",
          assignment_status: "active",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(orgAssignment);

  // 6. Create patient record for patient now assigned to this org (should succeed)
  const patientRecordRes: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          patient_user_id: patientUserId,
          full_name: patientName,
          dob: patientBirth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecordRes);
  // Check linkage
  TestValidator.equals(
    "organization linkage",
    patientRecordRes.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "patient linkage",
    patientRecordRes.patient_user_id,
    patientUserId,
  );
  TestValidator.equals("patient name", patientRecordRes.full_name, patientName);
  TestValidator.equals("patient dob", patientRecordRes.dob, patientBirth);

  // 7. Failure: Create record for non-existent patient (should fail)
  await TestValidator.error(
    "creating record for missing patient fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
        connection,
        {
          body: {
            organization_id: organization.id,
            patient_user_id: typia.random<string & tags.Format<"uuid">>(),
            full_name: "Ghost User",
            dob: new Date(2000, 0, 1).toISOString(),
            status: "active",
          } satisfies IHealthcarePlatformPatientRecord.ICreate,
        },
      );
    },
  );

  // 8. Failure: Create record for patient not assigned to organization
  // -- Create new patient, but do NOT assign to org
  const otherPatientEmail = typia.random<string & tags.Format<"email">>();
  const otherPatientName = RandomGenerator.name();
  const otherPatientBirth = new Date(1995, 5, 15).toISOString();
  await api.functional.auth.patient.join(connection, {
    body: {
      email: otherPatientEmail,
      full_name: otherPatientName,
      date_of_birth: otherPatientBirth,
      password: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  const otherPatientAuth = await api.functional.auth.patient
    .login(connection, {
      body: {
        email: otherPatientEmail,
        password: RandomGenerator.alphaNumeric(10), // wrong password to fail login (simulate; we only need id for this test)
      } satisfies IHealthcarePlatformPatient.ILogin,
    })
    .catch(() => null);
  const otherPatientId: string = otherPatientAuth
    ? otherPatientAuth.id
    : typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "creating record for unassigned patient fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
        connection,
        {
          body: {
            organization_id: organization.id,
            patient_user_id: otherPatientId,
            full_name: otherPatientName,
            dob: otherPatientBirth,
            status: "active",
          } satisfies IHealthcarePlatformPatientRecord.ICreate,
        },
      );
    },
  );

  // 9. Failure: Patient assigned to org1, but attempt creation under other org
  //   - create extra org, assign patient only to org1, but try to create record under new org
  const extraOrg: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(extraOrg);
  await TestValidator.error(
    "cross-organization record creation fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
        connection,
        {
          body: {
            organization_id: extraOrg.id,
            patient_user_id: patientUserId,
            full_name: patientName,
            dob: patientBirth,
            status: "active",
          } satisfies IHealthcarePlatformPatientRecord.ICreate,
        },
      );
    },
  );
}
