import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";

/**
 * Validate cross-organization access control and filtering for EHR version
 * history listing.
 *
 * 1. Register sysAdmin1 for org1, sysAdmin2 for org2.
 * 2. Each admin creates their own organization.
 * 3. Each org has a dedicated organization admin, patient, patient record, and
 *    medical doctor with an encounter.
 * 4. For each encounter, at least one EHR version exists in the system.
 * 5. Validate that EHR version listings by a sysAdmin are restricted to their own
 *    org and do not leak versions across organizations.
 * 6. Test further filtering on submitted_by_user_id (author) and version_number,
 *    verify only expected results returned.
 * 7. Attempt cross-org access: sysAdmin1 tries to see org2's EHR versions (should
 *    be empty), sysAdmin2 tries to see org1's (also empty).
 * 8. Defensive edge-case checks: only try filters if data present, never assume
 *    non-empty response.
 */
export async function test_api_ehr_version_index_access_control_and_filtering(
  connection: api.IConnection,
) {
  const sysAdmin1email =
    RandomGenerator.name(2).replace(" ", ".") + "@org1.com";
  const sysAdmin1Provider = "local";
  const sysAdmin1ProviderKey = sysAdmin1email;
  const sysAdmin2email =
    RandomGenerator.name(2).replace(" ", ".") + "@org2.com";
  const sysAdmin2Provider = "local";
  const sysAdmin2ProviderKey = sysAdmin2email;

  const sysAdmin1 = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdmin1email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      provider: sysAdmin1Provider,
      provider_key: sysAdmin1ProviderKey,
      password: "Test1234!@",
    },
  });
  typia.assert(sysAdmin1);

  const sysAdmin2 = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdmin2email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      provider: sysAdmin2Provider,
      provider_key: sysAdmin2ProviderKey,
      password: "Test1234!@",
    },
  });
  typia.assert(sysAdmin2);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin1email as string & tags.Format<"email">,
      provider: sysAdmin1Provider,
      provider_key: sysAdmin1ProviderKey,
      password: "Test1234!@",
    },
  });
  const org1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(org1);
  const orgAdmin1Email =
    RandomGenerator.name(2).replace(" ", ".") + "@org1-health.com";
  const orgAdmin1Pass = "Password#1";
  const orgAdmin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin1Email as string & tags.Format<"email">,
        full_name: RandomGenerator.name(2),
        password: orgAdmin1Pass,
        provider: "local",
        provider_key: orgAdmin1Email,
      },
    },
  );
  typia.assert(orgAdmin1);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin1Email as string & tags.Format<"email">,
      password: orgAdmin1Pass,
    },
  });
  const patient1 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email:
            RandomGenerator.name(2).replace(" ", "_") + "@patient1.org1.com",
          full_name: RandomGenerator.name(2),
          date_of_birth: new Date(1985, 3, 10).toISOString(),
        },
      },
    );
  typia.assert(patient1);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin1email as string & tags.Format<"email">,
      provider: sysAdmin1Provider,
      provider_key: sysAdmin1ProviderKey,
      password: "Test1234!@",
    },
  });
  const patientRecord1 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org1.id,
          patient_user_id: patient1.id,
          full_name: patient1.full_name,
          dob: patient1.date_of_birth as string & tags.Format<"date-time">,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord1);
  const md1email = RandomGenerator.name(2).replace(" ", ".") + "@md.org1.com";
  const md1pass = "DocPass@11";
  const md1npi = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: md1email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      npi_number: md1npi,
      password: md1pass as string & tags.Format<"password">,
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: md1email as string & tags.Format<"email">,
      password: md1pass as string & tags.Format<"password">,
    },
  });
  const encounter1 =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord1.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord1.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter1);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin2email as string & tags.Format<"email">,
      provider: sysAdmin2Provider,
      provider_key: sysAdmin2ProviderKey,
      password: "Test1234!@",
    },
  });
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(org2);
  const orgAdmin2Email =
    RandomGenerator.name(2).replace(" ", ".") + "@org2-health.com";
  const orgAdmin2Pass = "Password#2";
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdmin2Email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      password: orgAdmin2Pass,
      provider: "local",
      provider_key: orgAdmin2Email,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin2Email as string & tags.Format<"email">,
      password: orgAdmin2Pass,
    },
  });
  const patient2 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email:
            RandomGenerator.name(2).replace(" ", "_") + "@patient2.org2.com",
          full_name: RandomGenerator.name(2),
          date_of_birth: new Date(1980, 5, 20).toISOString(),
        },
      },
    );
  typia.assert(patient2);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin2email as string & tags.Format<"email">,
      provider: sysAdmin2Provider,
      provider_key: sysAdmin2ProviderKey,
      password: "Test1234!@",
    },
  });
  const patientRecord2 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org2.id,
          patient_user_id: patient2.id,
          full_name: patient2.full_name,
          dob: patient2.date_of_birth as string & tags.Format<"date-time">,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord2);
  const md2email = RandomGenerator.name(2).replace(" ", ".") + "@md.org2.com";
  const md2pass = "DocPass@22";
  const md2npi = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: md2email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      npi_number: md2npi,
      password: md2pass as string & tags.Format<"password">,
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: md2email as string & tags.Format<"email">,
      password: md2pass as string & tags.Format<"password">,
    },
  });
  const encounter2 =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord2.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter2);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: md1email as string & tags.Format<"email">,
      password: md1pass as string & tags.Format<"password">,
    },
  });

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin1email as string & tags.Format<"email">,
      provider: sysAdmin1Provider,
      provider_key: sysAdmin1ProviderKey,
      password: "Test1234!@",
    },
  });
  const baseRequest1 = {
    ehr_encounter_id: encounter1.id as string & tags.Format<"uuid">,
    page: 1,
    limit: 20,
  };
  const versions1 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord1.id as string & tags.Format<"uuid">,
        encounterId: encounter1.id as string & tags.Format<"uuid">,
        body: baseRequest1,
      },
    );
  typia.assert(versions1);
  TestValidator.predicate(
    "SysAdmin1 sees at least 1 EHR version for org1",
    versions1.data.length >= 1,
  );

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin2email as string & tags.Format<"email">,
      provider: sysAdmin2Provider,
      provider_key: sysAdmin2ProviderKey,
      password: "Test1234!@",
    },
  });
  const baseRequest2 = {
    ehr_encounter_id: encounter2.id as string & tags.Format<"uuid">,
    page: 1,
    limit: 20,
  };
  const versions2 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
        encounterId: encounter2.id as string & tags.Format<"uuid">,
        body: baseRequest2,
      },
    );
  typia.assert(versions2);
  TestValidator.predicate(
    "SysAdmin2 sees at least 1 EHR version for org2",
    versions2.data.length >= 1,
  );

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin1email as string & tags.Format<"email">,
      provider: sysAdmin1Provider,
      provider_key: sysAdmin1ProviderKey,
      password: "Test1234!@",
    },
  });
  const versions1see2 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
        encounterId: encounter2.id as string & tags.Format<"uuid">,
        body: baseRequest2,
      },
    );
  typia.assert(versions1see2);
  TestValidator.equals(
    "SysAdmin1 cannot see org2 EHR versions",
    versions1see2.data.length,
    0,
  );

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdmin2email as string & tags.Format<"email">,
      provider: sysAdmin2Provider,
      provider_key: sysAdmin2ProviderKey,
      password: "Test1234!@",
    },
  });
  const versions2see1 =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord1.id as string & tags.Format<"uuid">,
        encounterId: encounter1.id as string & tags.Format<"uuid">,
        body: baseRequest1,
      },
    );
  typia.assert(versions2see1);
  TestValidator.equals(
    "SysAdmin2 cannot see org1 EHR versions",
    versions2see1.data.length,
    0,
  );

  if (versions1.data.length > 0) {
    const exampleVersion = versions1.data[0];
    const filterReq = {
      ehr_encounter_id: encounter1.id as string & tags.Format<"uuid">,
      submitted_by_user_id: exampleVersion.submitted_by_user_id,
      page: 1,
      limit: 10,
    };
    const filtered =
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
        connection,
        {
          patientRecordId: patientRecord1.id as string & tags.Format<"uuid">,
          encounterId: encounter1.id as string & tags.Format<"uuid">,
          body: filterReq,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered EHR version(s) only submitted by correct MD",
      filtered.data.every(
        (v) => v.submitted_by_user_id === exampleVersion.submitted_by_user_id,
      ),
    );
  }
  if (versions2.data.length > 0) {
    const exampleVersion2 = versions2.data[0];
    const filterReq2 = {
      ehr_encounter_id: encounter2.id as string & tags.Format<"uuid">,
      version_number: exampleVersion2.version_number,
      page: 1,
      limit: 10,
    };
    const filtered2 =
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.index(
        connection,
        {
          patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
          encounterId: encounter2.id as string & tags.Format<"uuid">,
          body: filterReq2,
        },
      );
    typia.assert(filtered2);
    TestValidator.predicate(
      "filtered by version_number",
      filtered2.data.every(
        (v) => v.version_number === exampleVersion2.version_number,
      ),
    );
  }
}
