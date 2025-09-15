import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * 시스템 관리자가 개별 리셉셔니스트에게 알림을 발급하는 정상 성공 플로우를 검증한다.
 *
 * 1. 시스템 관리자 계정 생성 및 로그인 (local provider, password 포함)
 * 2. 리셉셔니스트 계정 생성(수신 대상)
 * 3. 관리자 권한으로 알림 발급: recipientUserId에 리셉셔니스트 id 지정
 * 4. 응답 알림 객체의 수신인·채널·타입·본문·상태 검증 및 입력 대비 정합성 확인
 */
export async function test_api_systemadmin_notification_issuance_success(
  connection: api.IConnection,
) {
  // 1. 시스템 관리자 계정 생성 (provider: local, 비밀번호 포함)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. 시스템 관리자 로그인 (provider: local)
  const authRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(authRes);

  // 3. 리셉셔니스트 계정 생성 (알림 실제 수신 대상)
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 4. 시스템 관리자가 알림 발급
  const notificationInput = {
    recipientUserId: receptionist.id,
    notificationType: "info",
    notificationChannel: "in_app",
    subject: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 2 }),
    critical: true,
  } satisfies IHealthcarePlatformNotification.ICreate;

  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: notificationInput,
      },
    );
  typia.assert(notification);

  TestValidator.equals(
    "알림 수신자 recipientUserId가 리셉셔니스트 id와 동일",
    notification.recipientUserId,
    notificationInput.recipientUserId,
  );
  TestValidator.equals(
    "알림 notificationType이 입력값과 동일",
    notification.notificationType,
    notificationInput.notificationType,
  );
  TestValidator.equals(
    "알림 notificationChannel이 입력값과 동일",
    notification.notificationChannel,
    notificationInput.notificationChannel,
  );
  TestValidator.equals(
    "알림 body 본문 내용이 입력값과 동일하게 저장됨",
    notification.body,
    notificationInput.body,
  );
  TestValidator.equals(
    "알림 subject(제목)이 입력값 subject와 동일",
    notification.subject,
    notificationInput.subject,
  );
  TestValidator.predicate(
    "알림 critical 플래그 true로 설정되어 있음",
    notification.critical === true,
  );
  TestValidator.predicate(
    "알림 deliveryStatus가 'pending' 또는 'delivered' 중 하나임",
    ["pending", "delivered"].includes(notification.deliveryStatus),
  );
  TestValidator.predicate(
    "deliveryAttempts가 0이상 int32로 반환됨",
    typeof notification.deliveryAttempts === "number" &&
      notification.deliveryAttempts >= 0,
  );
}
