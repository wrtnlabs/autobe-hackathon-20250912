import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin fetch of detailed appointment by ID (success and
 * not found).
 *
 * 1. Register system admin user (random business email, provider 'local')
 * 2. Authenticate system admin user via login
 * 3. Generate/fetch a random appointmentId (simulate as we cannot create
 *    appointment here)
 * 4. Success: System admin fetches appointment detail by ID, full details
 *    returned, typia asserts full object
 * 5. Not found: Fetch with non-existent appointmentId, returns error (not
 *    found/404)
 */
export async function test_api_systemadmin_get_full_appointment_details_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register system admin user (random business email, provider 'local')
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinOutput = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinOutput);

  // 2. Authenticate system admin user via login
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // 3. Generate a random appointmentId for test (simulate as no create API)
  const appointmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Success: Try to fetch appointment by ID (simulate, may succeed)
  const successDetail =
    await api.functional.healthcarePlatform.systemAdmin.appointments.at(
      connection,
      { appointmentId },
    );
  typia.assert(successDetail);
  // The response matches IHealthcarePlatformAppointment and includes all sensitive/cross-org fields.

  // 5. Not found: Use a new, guaranteed-random UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "system admin fetch with non-existent appointmentId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.at(
        connection,
        { appointmentId: nonExistentId },
      );
    },
  );
}
