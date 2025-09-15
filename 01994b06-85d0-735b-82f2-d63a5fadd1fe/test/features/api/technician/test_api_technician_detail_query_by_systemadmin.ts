import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate retrieval of full technician profile by systemAdmin.
 *
 * This test confirms that:
 *
 * 1. A systemAdmin can register and login, and can create a technician
 * 2. The newly created technician can be queried via
 *    /healthcarePlatform/systemAdmin/technicians/{technicianId}
 * 3. All information (name, contact, license, specialty, etc.) matches what was
 *    provided at creation
 * 4. Deleting or providing an invalid technicianId returns 404
 * 5. Retrieving as a non-systemAdmin user (unauthenticated) returns 403
 *
 * Steps:
 *
 * 1. Register systemAdmin
 * 2. Login as systemAdmin
 * 3. Create technician (randomized profile)
 * 4. Query technician as systemAdmin (expect full record)
 * 5. Query non-existent technicianId (expect 404)
 * 6. Query as unauthenticated user (expect 403)
 */
export async function test_api_technician_detail_query_by_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Login as system admin (should be redundant -- token already handled, but check with new token)
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminInput.email,
      provider: "local",
      provider_key: adminInput.provider_key,
      password: adminInput.password,
    },
  });
  typia.assert(login);

  // 3. Create technician
  const techInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    // Try one optional field, one omitted
    specialty: RandomGenerator.pick([null, RandomGenerator.name(1)]),
    phone: undefined,
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const technician =
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      {
        body: techInput,
      },
    );
  typia.assert(technician);
  TestValidator.equals(
    "technician profile matches creation input",
    {
      email: technician.email,
      full_name: technician.full_name,
      license_number: technician.license_number,
      specialty: technician.specialty ?? null,
      phone: technician.phone ?? null,
    },
    {
      email: techInput.email,
      full_name: techInput.full_name,
      license_number: techInput.license_number,
      specialty: techInput.specialty ?? null,
      phone: techInput.phone ?? null,
    },
  );
  TestValidator.predicate(
    "creation timestamp is valid",
    typeof technician.created_at === "string" &&
      technician.created_at.length > 0,
  );

  // 4. Query technician by ID
  const read =
    await api.functional.healthcarePlatform.systemAdmin.technicians.at(
      connection,
      {
        technicianId: technician.id,
      },
    );
  typia.assert(read);
  TestValidator.equals(
    "queried profile matches created",
    {
      email: read.email,
      full_name: read.full_name,
      license_number: read.license_number,
      specialty: read.specialty ?? null,
      phone: read.phone ?? null,
    },
    {
      email: techInput.email,
      full_name: techInput.full_name,
      license_number: techInput.license_number,
      specialty: techInput.specialty ?? null,
      phone: techInput.phone ?? null,
    },
  );

  // 5. Query with non-existent technicianId (expect 404 error)
  await TestValidator.error("404 on non-existent technician", async () => {
    await api.functional.healthcarePlatform.systemAdmin.technicians.at(
      connection,
      {
        technicianId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 6. Query as unauthenticated user (expect 403), use a connection with unauthenticated context
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("403 for unauthenticated context", async () => {
    await api.functional.healthcarePlatform.systemAdmin.technicians.at(
      unauthConn,
      {
        technicianId: technician.id,
      },
    );
  });
}
